import { useMemo } from "react";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { and, desc, eq, gte, lt, or } from "drizzle-orm";

import { db } from "../client";
import { transactions, type CategoryKind } from "../schema";
import {
  categoryUsageQuery,
  frequentAmountsQuery,
  lastUsedAccountQuery,
  USAGE_WINDOW_DAYS,
} from "../../services/transactionDefaults";

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

// --- New Transaction quick-entry smart defaults (spec.md §5.2a) ---
// The actual aggregation queries live in services/transactionDefaults.ts
// (plain `(db, ...)` functions, unit-tested there); these hooks just make
// them reactive.

// Stable for the component's lifetime rather than recomputed every render
// (Date.now() changes constantly, which would otherwise feed a new value
// into useLiveQuery's deps array on every render and defeat memoization).
// A 90-day window doesn't need finer-grained freshness than "per mount".
function useUsageCutoff(): Date {
  return useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - USAGE_WINDOW_DAYS);
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
}

export function useCategoryUsageOrder(kind: CategoryKind) {
  const cutoff = useUsageCutoff();
  return useLiveQuery(categoryUsageQuery(db, kind, cutoff), [kind, cutoff.getTime()]);
}

// `categoryId` is `-1` (never a real id) when no category is selected yet,
// same sentinel idiom as useTransactionTagIds's "-1 means nothing yet".
export function useLastUsedAccountForCategory(categoryId: number) {
  const { data } = useLiveQuery(lastUsedAccountQuery(db, categoryId), [categoryId]);
  return data?.[0]?.accountId;
}

export function useFrequentAmountsForCategory(categoryId: number) {
  const cutoff = useUsageCutoff();
  return useLiveQuery(frequentAmountsQuery(db, categoryId, cutoff), [categoryId, cutoff.getTime()]);
}
