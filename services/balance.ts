import { and, asc, eq, gte, lt, sql } from "drizzle-orm";

import type { Db } from "../db/client";
import { transactions } from "../db/schema";

// Caps the Dashboard's net worth trend chart to the account's actual
// history — a brand-new profile shouldn't show 11 months of misleading
// flat-zero padding before it existed.
export function getEarliestTransactionDate(db: Db): Date | null {
  const row = db.select({ date: transactions.date }).from(transactions).orderBy(asc(transactions.date)).get();
  return row?.date ?? null;
}

// A transaction affects an account's balance from one of two sides:
// income/expense rows via `accountId`, transfer rows via either leg
// (`accountId` = outgoing, `toAccountId` = incoming). Summing both sides
// gives the account's balance.
//
// `asOfDate` (exclusive upper bound, consistent with getPeriodTotals'
// `range.end`) scopes this to "as of a specific point in time" rather than
// always "as of now" — without it, navigating an account's page to a past
// month left the Balance figure showing today's live balance while
// Income/Expense right next to it correctly changed with the month. An
// account's own opening-balance row is dated at its openingDate, so it
// naturally drops out once asOfDate falls before that — no special-casing
// needed here, same as getPeriodTotals.
export function getAccountBalanceMinor(db: Db, accountId: number, asOfDate?: Date): number {
  const dateFilter = asOfDate ? [lt(transactions.date, asOfDate)] : [];

  const outgoing = db
    .select({
      total: sql<number>`coalesce(sum(case
        when ${transactions.type} = 'income' then ${transactions.amountMinor}
        when ${transactions.type} = 'expense' then -${transactions.amountMinor}
        when ${transactions.type} = 'transfer' then -${transactions.amountMinor}
        else 0 end), 0)`,
    })
    .from(transactions)
    .where(and(eq(transactions.accountId, accountId), ...dateFilter))
    .get();

  const incoming = db
    .select({
      total: sql<number>`coalesce(sum(${transactions.amountMinor}), 0)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.type, "transfer"),
        eq(transactions.toAccountId, accountId),
        ...dateFilter,
      ),
    )
    .get();

  return (outgoing?.total ?? 0) + (incoming?.total ?? 0);
}

export interface PeriodTotals {
  incomeMinor: number;
  expenseMinor: number;
}

// Income/expense totals for a period, scoped to one account or all accounts.
// Transfers are excluded — spec.md §5.4's income/expense figures describe
// money entering or leaving the tracked accounts as a whole, not internal
// moves between them.
export function getPeriodTotals(
  db: Db,
  { accountId, start, end }: { accountId?: number; start: Date; end: Date },
): PeriodTotals {
  const conditions = [
    gte(transactions.date, start),
    lt(transactions.date, end),
  ];
  if (accountId !== undefined) {
    conditions.push(eq(transactions.accountId, accountId));
  }

  const row = db
    .select({
      incomeMinor: sql<number>`coalesce(sum(case when ${transactions.type} = 'income' then ${transactions.amountMinor} else 0 end), 0)`,
      expenseMinor: sql<number>`coalesce(sum(case when ${transactions.type} = 'expense' then ${transactions.amountMinor} else 0 end), 0)`,
    })
    .from(transactions)
    .where(and(...conditions))
    .get();

  return row ?? { incomeMinor: 0, expenseMinor: 0 };
}

// Credit card balance is naturally negative (spec.md §5.1); the net amount
// currently owed is the positive inverse of that balance.
export function getCreditCardOwedMinor(db: Db, accountId: number, asOfDate?: Date): number {
  return -getAccountBalanceMinor(db, accountId, asOfDate);
}

export interface DebtPayoffProjection {
  owedTodayMinor: number;
  monthlyReductionMinor: number;
  projectedDate: Date | null;
}

// Anchored to today's real balance regardless of whichever month the
// Account Detail page is otherwise browsing — "am I paying this off" is a
// today question, same reasoning as Goals using today's real net worth
// rather than a viewed month's. Trailing 6-month pace, same window as
// Goals' growth-rate projection.
export function getDebtPayoffProjection(db: Db, accountId: number): DebtPayoffProjection | null {
  const now = new Date();
  const todayCutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const sixMonthsAgoCutoff = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());

  const owedTodayMinor = Math.max(0, getCreditCardOwedMinor(db, accountId, todayCutoff));
  if (owedTodayMinor <= 0) return null;

  const owedSixMonthsAgoMinor = Math.max(0, getCreditCardOwedMinor(db, accountId, sixMonthsAgoCutoff));
  const monthlyReductionMinor = (owedSixMonthsAgoMinor - owedTodayMinor) / 6;

  let projectedDate: Date | null = null;
  if (monthlyReductionMinor > 0) {
    const monthsToPayoff = Math.ceil(owedTodayMinor / monthlyReductionMinor);
    projectedDate = new Date(todayCutoff.getFullYear(), todayCutoff.getMonth() + monthsToPayoff, todayCutoff.getDate());
  }

  return { owedTodayMinor, monthlyReductionMinor, projectedDate };
}

// Net worth at each cutoff date, converted to the app's base currency —
// powers Goals' progress/pace projection and (later) the Dashboard's net
// worth trend chart. The real web app folds one query pass over every
// transaction incrementally per cutoff to avoid O(accounts × cutoffs)
// queries; this instead calls the already-tested getAccountBalanceMinor
// per account per cutoff. At this app's actual scale (one local user, a
// handful of accounts, a handful of cutoffs) that's a trivial number of
// cheap indexed queries — reusing proven logic outweighs the
// micro-optimization, rather than re-deriving the same balance math a
// second way that could drift out of sync with it.
export function getNetWorthSeries(
  db: Db,
  accounts: { id: number; currency: string }[],
  cutoffs: Date[],
  toBaseMinor: (amountMinor: number, currency: string) => number,
): number[] {
  return cutoffs.map((cutoff) =>
    accounts.reduce(
      (sum, account) => sum + toBaseMinor(getAccountBalanceMinor(db, account.id, cutoff), account.currency),
      0,
    ),
  );
}
