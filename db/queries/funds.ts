import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { asc, eq, sql } from "drizzle-orm";

import { db } from "../client";
import { fundAllocations, funds } from "../schema";

// One ordering used everywhere funds are listed — the Funds screen and the
// Dashboard card (which just takes the first 3) — so the two can never
// disagree about which funds are "top". Soonest target date first, since
// those are the time-pressured ones, undated funds after them, then oldest
// first as a stable tiebreak. The CASE expression rather than NULLS LAST
// keeps this working on any SQLite version.
const FUND_ORDER = [
  sql`case when ${funds.targetDate} is null then 1 else 0 end`,
  asc(funds.targetDate),
  asc(funds.createdAt),
];

export function useFunds() {
  return useLiveQuery(db.select().from(funds).orderBy(...FUND_ORDER));
}

export function useFund(id: number) {
  const { data } = useLiveQuery(db.select().from(funds).where(eq(funds.id, id)), [id]);
  return data?.[0] ?? null;
}

// Subscribe-only hook for screens that show fund *balances* rather than a
// list of entries. Those balances come from services/funds.ts, a plain
// synchronous read that isn't reactive on its own, and `useFunds()` alone
// only repaints when the `funds` table changes — so adding or releasing
// money left the Dashboard and the Funds list showing a stale figure until
// something else forced a render. Call it for the subscription and ignore
// the rows; same trick (and same reason) as the Dashboard's bare
// useFilteredTransactions call. Don't "clean up" the unused result.
export function useFundAllocationsSubscription() {
  useLiveQuery(db.select({ id: fundAllocations.id }).from(fundAllocations));
}

// The manual add/release entries for one fund, newest first. The fund's
// *spending* history lives on the transactions themselves — see
// services/funds.ts's getFundHistory, which merges the two without
// duplicating any financial record.
export function useFundAllocations(fundId: number) {
  return useLiveQuery(
    db
      .select()
      .from(fundAllocations)
      .where(eq(fundAllocations.fundId, fundId))
      .orderBy(sql`${fundAllocations.date} desc`, sql`${fundAllocations.id} desc`),
    // Explicit deps: useLiveQuery defaults them to `[]`, which never
    // re-subscribes — the app-wide bug fixed in db/queries/transactions.ts.
    [fundId],
  );
}
