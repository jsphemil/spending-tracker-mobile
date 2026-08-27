import { useMemo } from "react";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { asc, desc, eq } from "drizzle-orm";

import { db } from "../client";
import { accounts, tags, transactionTags, transactions } from "../schema";

export function useTags() {
  return useLiveQuery(db.select().from(tags).orderBy(asc(tags.name)));
}

// Tag names ordered by how recently they were used (most recent
// transaction date first, deduped), for the Dashboard's "recent tags"
// card — not just alphabetical like useTags(). Dedupes in JS rather than
// a raw SQL MAX(date) aggregate so the date column still goes through
// drizzle's normal timestamp mapping (see services/balance.ts's
// getEarliestTransactionDate for the same reasoning).
export function useRecentTagNames(limit: number): string[] {
  const { data } = useLiveQuery(
    db
      .select({ name: tags.name })
      .from(transactionTags)
      .innerJoin(tags, eq(transactionTags.tagId, tags.id))
      .innerJoin(transactions, eq(transactionTags.transactionId, transactions.id))
      .orderBy(desc(transactions.date)),
  );
  return useMemo(() => {
    const seen = new Set<string>();
    const names: string[] = [];
    for (const row of data ?? []) {
      if (seen.has(row.name)) continue;
      seen.add(row.name);
      names.push(row.name);
      if (names.length >= limit) break;
    }
    return names;
  }, [data, limit]);
}

export function useTransactionTagIds(transactionId: number) {
  const { data } = useLiveQuery(
    db
      .select({ tagId: transactionTags.tagId })
      .from(transactionTags)
      .where(eq(transactionTags.transactionId, transactionId)),
    [transactionId],
  );
  return data?.map((row) => row.tagId) ?? [];
}

export function useTransactionTagNames(transactionId: number) {
  const { data } = useLiveQuery(
    db
      .select({ name: tags.name })
      .from(transactionTags)
      .innerJoin(tags, eq(transactionTags.tagId, tags.id))
      .where(eq(transactionTags.transactionId, transactionId)),
    [transactionId],
  );
  return data?.map((row) => row.name) ?? [];
}

// Every transaction carrying a tag, regardless of which account or category
// it actually belongs to (spec.md §5.3a) — joined with the account so the
// summary view can convert foreign-currency amounts to the base currency.
export function useTagTransactions(tagName: string) {
  return useLiveQuery(
    db
      .select({
        transaction: transactions,
        accountCurrency: accounts.currency,
        accountName: accounts.name,
      })
      .from(transactionTags)
      .innerJoin(tags, eq(transactionTags.tagId, tags.id))
      .innerJoin(transactions, eq(transactionTags.transactionId, transactions.id))
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .where(eq(tags.name, tagName))
      .orderBy(desc(transactions.date)),
    [tagName],
  );
}
