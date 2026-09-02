import { and, eq } from "drizzle-orm";

import { db } from "../client";
import { settings, transactionTags, transactions, type TransactionType } from "../schema";
import { refreshAccountsWidget } from "../../widgets/refresh";
import { rescheduleExpenseReminder } from "../../services/notifications";

export interface TransactionInput {
  type: TransactionType;
  amountMinor: number;
  date: Date;
  accountId: number;
  toAccountId?: number | null;
  categoryId?: number | null;
  description?: string | null;
  tagIds: number[];
}

export function createTransaction(input: TransactionInput): number {
  const newId = db.transaction((tx) => {
    const [row] = tx
      .insert(transactions)
      .values({
        type: input.type,
        amountMinor: input.amountMinor,
        date: input.date,
        accountId: input.accountId,
        toAccountId: input.type === "transfer" ? input.toAccountId ?? null : null,
        categoryId: input.type === "transfer" ? null : input.categoryId ?? null,
        description: input.description ?? null,
      })
      .returning({ id: transactions.id })
      .all();

    for (const tagId of input.tagIds) {
      tx.insert(transactionTags).values({ transactionId: row.id, tagId }).run();
    }

    return row.id;
  });
  refreshAccountsWidget();
  if (input.type === "expense") {
    // Today's first expense should push the pending reminder to tomorrow
    // right away, not wait for the next app-foreground check.
    const row = db.select().from(settings).limit(1).get();
    if (row) rescheduleExpenseReminder(db, row).catch(() => {});
  }
  return newId;
}

// Kept in sync with the account's own opening-balance fields (see
// db/actions/accounts.ts) — not directly editable/deletable through the
// normal transaction UI (app/transaction/[id]/edit.tsx already blocks
// this), these two checks are a backstop against any other call path.
// Same reasoning applies to recurring-generated rows: editing one directly
// here would silently skip services/recurrence.ts's occurrenceDate-anchor
// and isRecurringException bookkeeping — the edit screen routes those
// through editSingleOccurrence/editFutureOccurrences instead, and this is
// the backstop against any other call path doing it wrong.
export function updateTransaction(id: number, input: TransactionInput): void {
  db.transaction((tx) => {
    const existing = tx
      .select({ isOpeningBalance: transactions.isOpeningBalance, recurringRuleId: transactions.recurringRuleId })
      .from(transactions)
      .where(eq(transactions.id, id))
      .get();
    if (existing?.isOpeningBalance) {
      throw new Error("Edit the opening balance from the account's own edit page instead.");
    }
    if (existing?.recurringRuleId != null) {
      throw new Error("Edit a recurring transaction through its own edit flow instead.");
    }

    tx.update(transactions)
      .set({
        type: input.type,
        amountMinor: input.amountMinor,
        date: input.date,
        accountId: input.accountId,
        toAccountId: input.type === "transfer" ? input.toAccountId ?? null : null,
        categoryId: input.type === "transfer" ? null : input.categoryId ?? null,
        description: input.description ?? null,
      })
      .where(eq(transactions.id, id))
      .run();

    tx.delete(transactionTags).where(eq(transactionTags.transactionId, id)).run();
    for (const tagId of input.tagIds) {
      tx.insert(transactionTags).values({ transactionId: id, tagId }).run();
    }
  });
  refreshAccountsWidget();
}

export function deleteTransaction(id: number): void {
  db.delete(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.isOpeningBalance, false)))
    .run();
  refreshAccountsWidget();
}
