import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { asc, desc, eq, sql } from "drizzle-orm";

import { db } from "../client";
import { accounts, tags, transactionTags, transactions } from "../schema";

export function useTags() {
  return useLiveQuery(db.select().from(tags).orderBy(asc(tags.name)));
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

export interface TagChip {
  id: number;
  name: string;
  icon: string;
  color: string;
}

// The tags on one transaction with their appearance, so a chip looks the
// same wherever the tag appears (spec.md §5.3a).
export function useTransactionTags(transactionId: number): TagChip[] {
  const { data } = useLiveQuery(
    db
      .select({ id: tags.id, name: tags.name, icon: tags.icon, color: tags.color })
      .from(transactionTags)
      .innerJoin(tags, eq(transactionTags.tagId, tags.id))
      .where(eq(transactionTags.transactionId, transactionId)),
    [transactionId],
  );
  return data ?? [];
}

export function useTagByName(name: string) {
  const { data, ...rest } = useLiveQuery(db.select().from(tags).where(eq(tags.name, name)), [name]);
  return { tag: data?.[0], ...rest };
}

// One row per tag *per account currency* for the Tags overview — the
// income/expense sums can't be added across currencies in SQL, so
// services/tagSummary.ts folds these into base-currency totals with the
// screen's converter. Left joins keep tags with no transactions (a tag just
// created, or emptied) in the list with zero counts. Transfers are
// excluded, matching the tag page's own totals.
export interface TagSummaryRow {
  id: number;
  name: string;
  icon: string;
  color: string;
  currency: string | null;
  txCount: number;
  incomeMinor: number;
  expenseMinor: number;
}

export function useTagSummaries() {
  return useLiveQuery(
    db
      .select({
        id: tags.id,
        name: tags.name,
        icon: tags.icon,
        color: tags.color,
        currency: accounts.currency,
        txCount: sql<number>`count(${transactions.id})`,
        incomeMinor: sql<number>`coalesce(sum(case when ${transactions.type} = 'income' then ${transactions.amountMinor} else 0 end), 0)`,
        expenseMinor: sql<number>`coalesce(sum(case when ${transactions.type} = 'expense' then ${transactions.amountMinor} else 0 end), 0)`,
      })
      .from(tags)
      .leftJoin(transactionTags, eq(transactionTags.tagId, tags.id))
      .leftJoin(transactions, eq(transactions.id, transactionTags.transactionId))
      .leftJoin(accounts, eq(accounts.id, transactions.accountId))
      .groupBy(tags.id, accounts.currency)
      .orderBy(asc(tags.name)),
  );
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
