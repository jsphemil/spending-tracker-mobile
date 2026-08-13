import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { and, desc, eq, gte, lt, or } from "drizzle-orm";

import { db } from "../client";
import { transactions } from "../schema";

// A transaction touches an account via either accountId (income/expense, or
// a transfer's outgoing leg) or toAccountId (a transfer's incoming leg) —
// services/balance.ts's getAccountBalanceMinor already sums both sides, but
// this query only checked accountId, so an inbound transfer silently never
// appeared in the account's own transaction list even though it correctly
// moved the balance. Matches getAccountBalanceMinor's two-sided condition.
export function useAccountTransactions(
  accountId: number,
  range?: { start: Date; end: Date },
) {
  const conditions = [
    or(eq(transactions.accountId, accountId), eq(transactions.toAccountId, accountId)),
  ];
  if (range) {
    conditions.push(gte(transactions.date, range.start), lt(transactions.date, range.end));
  }

  // drizzle-orm/expo-sqlite's useLiveQuery defaults its effect's deps to
  // `[]` when not given a second argument — without this, the query
  // literally never re-subscribes after the first render, no matter how
  // much accountId/range change on later renders (confirmed live 2026-08-12:
  // switching the account filter pill or paging the month nav changed the
  // header text but the underlying list stayed frozen on whatever was
  // selected when the screen first mounted). Depending on primitives
  // (`.getTime()`, not the Date object itself) rather than `range` as a
  // whole avoids relying on every caller memoizing that object correctly.
  return useLiveQuery(
    db
      .select()
      .from(transactions)
      .where(and(...conditions))
      .orderBy(desc(transactions.date), desc(transactions.id)),
    [accountId, range?.start.getTime(), range?.end.getTime()],
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
  if (accountId !== undefined) {
    conditions.push(or(eq(transactions.accountId, accountId), eq(transactions.toAccountId, accountId)));
  }
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
    [accountId, categoryId, range?.start.getTime(), range?.end.getTime()],
  );
}
