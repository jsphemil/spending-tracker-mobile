import { and, count, eq } from "drizzle-orm";

import { db } from "../client";
import { accounts, transactions, type AccountType } from "../schema";

export interface AccountInput {
  name: string;
  type: AccountType;
  color: string;
  icon: string;
  currency: string;
  creditLimitMinor?: number | null;
  openingBalanceMinor: number;
  openingDate: Date;
}

// Opening balance is stored as a real, flagged transaction row (not just an
// account field) so it flows through every ledger query — balance sums,
// period totals, account history — uniformly. Signed amount is encoded as
// income (positive) or expense (negative-as-absolute) so balance.ts needs
// no special case for it. A balance of exactly 0 gets no row at all — a
// zero-amount "Opening balance" line is meaningless clutter in the ledger,
// and skipping it here mirrors the real source app's syncOpeningBalanceTransaction.
export function createAccount(input: AccountInput): number {
  return db.transaction((tx) => {
    const [account] = tx
      .insert(accounts)
      .values({
        name: input.name,
        type: input.type,
        color: input.color,
        icon: input.icon,
        currency: input.currency,
        creditLimitMinor: input.creditLimitMinor ?? null,
      })
      .returning({ id: accounts.id })
      .all();

    if (input.openingBalanceMinor !== 0) {
      tx.insert(transactions)
        .values({
          type: input.openingBalanceMinor >= 0 ? "income" : "expense",
          amountMinor: Math.abs(input.openingBalanceMinor),
          date: input.openingDate,
          accountId: account.id,
          description: "Opening balance",
          isOpeningBalance: true,
        })
        .run();
    }

    return account.id;
  });
}

export interface AccountUpdateInput {
  name: string;
  type: AccountType;
  color: string;
  icon: string;
  currency: string;
  creditLimitMinor?: number | null;
  budgetModeEnabled?: boolean | null;
  showFutureTxEnabled?: boolean | null;
  budgetMonthlyMinor?: number | null;
  openingBalanceMinor: number;
  openingDate: Date;
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Mirrors the real app's syncOpeningBalanceTransaction: create/update/delete
// the opening-balance row as needed rather than assuming one always exists
// (it doesn't, once createAccount started skipping the zero case above).
function syncOpeningBalanceTransaction(
  tx: Tx,
  accountId: number,
  openingBalanceMinor: number,
  openingDate: Date,
): void {
  const existing = tx
    .select({ id: transactions.id })
    .from(transactions)
    .where(and(eq(transactions.accountId, accountId), eq(transactions.isOpeningBalance, true)))
    .get();

  if (openingBalanceMinor === 0) {
    if (existing) {
      tx.delete(transactions).where(eq(transactions.id, existing.id)).run();
    }
    return;
  }

  const data = {
    type: (openingBalanceMinor >= 0 ? "income" : "expense") as "income" | "expense",
    amountMinor: Math.abs(openingBalanceMinor),
    date: openingDate,
  };

  if (existing) {
    tx.update(transactions).set(data).where(eq(transactions.id, existing.id)).run();
  } else {
    tx.insert(transactions)
      .values({ ...data, accountId, description: "Opening balance", isOpeningBalance: true })
      .run();
  }
}

export function updateAccount(id: number, input: AccountUpdateInput): void {
  db.transaction((tx) => {
    tx.update(accounts)
      .set({
        name: input.name,
        type: input.type,
        color: input.color,
        icon: input.icon,
        currency: input.currency,
        creditLimitMinor: input.creditLimitMinor ?? null,
        budgetModeEnabled: input.budgetModeEnabled ?? null,
        showFutureTxEnabled: input.showFutureTxEnabled ?? null,
        budgetMonthlyMinor: input.budgetMonthlyMinor ?? null,
      })
      .where(eq(accounts.id, id))
      .run();

    syncOpeningBalanceTransaction(tx, id, input.openingBalanceMinor, input.openingDate);
  });
}

// Two things block deletion, checked before anything is touched:
// - Real (non-opening-balance) transactions referencing this account, as
//   either leg — the FK's onDelete: "restrict" would catch this too, but
//   checking first lets us return a friendly, specific count instead of a
//   raw constraint-violation error.
// - The account's own opening-balance row does NOT block deletion (it's
//   account metadata, not real activity) — but it still has to be deleted
//   explicitly before the account, or that same FK restrict blocks
//   deletion anyway, since it's a transaction row too.
export function deleteAccount(id: number): void {
  db.transaction((tx) => {
    const inUse = tx
      .select({ n: count() })
      .from(transactions)
      .where(
        and(
          eq(transactions.isOpeningBalance, false),
          // accountId covers income/expense/from-leg; toAccountId covers the to-leg.
          eq(transactions.accountId, id),
        ),
      )
      .get();
    const inUseAsTransferTarget = tx
      .select({ n: count() })
      .from(transactions)
      .where(eq(transactions.toAccountId, id))
      .get();
    const inUseCount = (inUse?.n ?? 0) + (inUseAsTransferTarget?.n ?? 0);
    if (inUseCount > 0) {
      throw new Error(
        `This account has ${inUseCount} transaction${inUseCount === 1 ? "" : "s"} — delete or move them first.`,
      );
    }

    tx.delete(transactions)
      .where(and(eq(transactions.accountId, id), eq(transactions.isOpeningBalance, true)))
      .run();
    tx.delete(accounts).where(eq(accounts.id, id)).run();
  });
}
