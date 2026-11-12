import { and, asc, desc, eq, gt, gte, ne, sql } from "drizzle-orm";

import type { Db } from "../db/client";
import { categories, transactions, type CategoryKind } from "../db/schema";

// New Transaction quick-entry smart defaults (spec.md §5.2a). Each function
// here returns a not-yet-executed drizzle query builder, the same shape
// db/queries/transactions.ts's useLiveQuery hooks subscribe to directly —
// kept here as plain `(db, ...)` functions (rather than inline in the
// hooks) so the actual aggregation logic can be unit-tested against
// __tests__/testDb.ts the same way services/balance.ts's functions are,
// without needing a React/hooks test environment.

export const USAGE_WINDOW_DAYS = 90;

export interface CategoryUsageRow {
  id: number;
  name: string;
  icon: string;
  color: string;
  useCount: number;
}

// Drives the quick-entry category grid's ordering: most-used categories
// first over the last 90 days, falling back to (sortOrder, id) for ties
// and never-used categories — the same fallback useCategories already
// uses. "Adjusting" is a balance-correction category, not real spending,
// so it's excluded from the ranking entirely (still reachable via "More").
// shortcut: matched by category name, not a schema flag — renaming it
// would silently stop excluding it; add a schema flag if that happens.
export function categoryUsageQuery(db: Db, kind: CategoryKind, cutoff: Date) {
  return db
    .select({
      id: categories.id,
      name: categories.name,
      icon: categories.icon,
      color: categories.color,
      useCount: sql<number>`count(${transactions.id})`,
    })
    .from(categories)
    .leftJoin(
      transactions,
      and(
        eq(transactions.categoryId, categories.id),
        eq(transactions.isOpeningBalance, false),
        gte(transactions.date, cutoff),
      ),
    )
    .where(and(eq(categories.kind, kind), ne(categories.name, "Adjusting")))
    .groupBy(categories.id)
    .orderBy(sql`count(${transactions.id}) desc`, asc(categories.sortOrder), asc(categories.id));
}

// The account most recently used with this category — the caller pre-fills
// the Account chip with it ("Last used here") unless that slot is already
// taken by a deep-link param, a duplicate, or a manual pick.
export function lastUsedAccountQuery(db: Db, categoryId: number) {
  return db
    .select({ accountId: transactions.accountId })
    .from(transactions)
    .where(and(eq(transactions.categoryId, categoryId), eq(transactions.isOpeningBalance, false)))
    .orderBy(desc(transactions.date), desc(transactions.id))
    .limit(1);
}

// Top 3-4 most common amounts for this category, last 90 days — drives the
// "Frequent for Groceries" quick-amount chips. The category already pins
// the kind, so no separate kind filter is needed. Caller falls back to a
// generic amount set when this comes back empty.
export function frequentAmountsQuery(db: Db, categoryId: number, cutoff: Date) {
  return db
    .select({ amountMinor: transactions.amountMinor, count: sql<number>`count(*)` })
    .from(transactions)
    .where(
      and(
        eq(transactions.categoryId, categoryId),
        eq(transactions.isOpeningBalance, false),
        gte(transactions.date, cutoff),
        // Refunds are stored as negative expenses; never suggest one as a quick amount.
        gt(transactions.amountMinor, 0),
      ),
    )
    .groupBy(transactions.amountMinor)
    .orderBy(sql`count(*) desc`)
    .limit(4);
}
