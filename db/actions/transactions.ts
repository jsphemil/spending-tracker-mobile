import { eq } from "drizzle-orm";

import { db } from "../client";
import { transactionTags, transactions, type TransactionType } from "../schema";

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
  return db.transaction((tx) => {
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
}

export function updateTransaction(id: number, input: TransactionInput): void {
  db.transaction((tx) => {
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
}

export function deleteTransaction(id: number): void {
  db.delete(transactions).where(eq(transactions.id, id)).run();
}
