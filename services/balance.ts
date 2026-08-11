import { and, eq, gte, lt, sql } from "drizzle-orm";

import type { Db } from "../db/client";
import { transactions } from "../db/schema";

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
