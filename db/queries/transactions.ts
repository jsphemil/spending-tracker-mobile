import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { and, desc, eq, gte, lt } from "drizzle-orm";

import { db } from "../client";
import { transactions } from "../schema";

export function useAccountTransactions(
  accountId: number,
  range?: { start: Date; end: Date },
) {
  const conditions = [eq(transactions.accountId, accountId)];
  if (range) {
    conditions.push(gte(transactions.date, range.start), lt(transactions.date, range.end));
  }

  return useLiveQuery(
    db
      .select()
      .from(transactions)
      .where(and(...conditions))
      .orderBy(desc(transactions.date), desc(transactions.id)),
  );
}

export interface TransactionFilters {
  accountId?: number;
  categoryId?: number;
  range?: { start: Date; end: Date };
}

export function useFilteredTransactions({
  accountId,
  categoryId,
  range,
}: TransactionFilters) {
  const conditions = [];
  if (accountId !== undefined) conditions.push(eq(transactions.accountId, accountId));
  if (categoryId !== undefined) conditions.push(eq(transactions.categoryId, categoryId));
  if (range) {
    conditions.push(gte(transactions.date, range.start), lt(transactions.date, range.end));
  }

  return useLiveQuery(
    db
      .select()
      .from(transactions)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(transactions.date), desc(transactions.id)),
  );
}
