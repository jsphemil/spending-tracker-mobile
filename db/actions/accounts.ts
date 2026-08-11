import { and, eq } from "drizzle-orm";

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
// no special case for it.
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

    tx.update(transactions)
      .set({
        type: input.openingBalanceMinor >= 0 ? "income" : "expense",
        amountMinor: Math.abs(input.openingBalanceMinor),
        date: input.openingDate,
      })
      .where(
        and(eq(transactions.accountId, id), eq(transactions.isOpeningBalance, true)),
      )
      .run();
  });
}

// Relies on the accounts.id foreign key's onDelete: "restrict" (enforced
// via PRAGMA foreign_keys = ON in db/client.ts) to reject deletion while any
// transaction or recurring rule still references this account — callers
// should catch and surface that as a friendly "still in use" message.
export function deleteAccount(id: number): void {
  db.delete(accounts).where(eq(accounts.id, id)).run();
}
