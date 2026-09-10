import { and, eq, isNotNull, lt, sql } from "drizzle-orm";

import type { Db } from "../db/client";
import { accounts, fundAllocations, funds, transactions } from "../db/schema";

export interface FundBalance {
  fundId: number;
  /** Manual add/release entries, summed. Signed, base currency. */
  allocatedMinor: number;
  /** Linked expenses, summed and converted to base currency. */
  spentMinor: number;
  /** How much of `spentMinor` the fund actually covered. */
  consumedMinor: number;
  /**
   * What the ledger says this fund holds, ignoring whether it's closed —
   * i.e. the amount that would come back if it were reopened.
   */
  heldMinor: number;
  /**
   * What's actually earmarked, and the only figure that feeds Earmarked.
   * Same as `heldMinor` for an open fund; forced to 0 once a fund is
   * closed. Never negative.
   */
  fundedMinor: number;
  /** Spending the fund couldn't cover — it came from unallocated wealth. */
  overspentMinor: number;
}

const EMPTY_BALANCE = {
  allocatedMinor: 0,
  spentMinor: 0,
  consumedMinor: 0,
  heldMinor: 0,
  fundedMinor: 0,
  overspentMinor: 0,
};

// A fund's balance is DERIVED from its allocation ledger and its linked
// expenses — it is never stored. See db/schema.ts's fundAllocations comment
// for why: a stored column would need write hooks on every transaction
// create/update/delete path, and any path that forgot one would silently
// corrupt the figure. Deriving is what makes rule 14 (edit a fund-linked
// expense from 40000 to 35000, get 5000 back; delete it, get all 40000
// back) work with no reconciliation code at all. Don't "optimize" this into
// a column.
//
//   consumed = min(allocated, spent)   -- can't consume more than was there
//   funded   = allocated − consumed    -- therefore never negative
//   overspent= max(0, spent − allocated)
//
// The clamp is what makes a fund a *source of money*, never a spending
// limit (spec.md §5.21): a 40000 fund meeting a 50000 purchase contributes
// 40000 and reports the other 10000 as overspend, rather than going
// negative or capping the expense.
//
// `asOfDate` is an exclusive upper bound, the same convention as
// getAccountBalanceMinor — and required for the same reason. Omitting it on
// the Dashboard would pair a range.end net worth with a today-anchored
// Earmarked, and the Net worth − Earmarked = Unallocated arithmetic on
// screen would visibly stop adding up as soon as the month-nav was paged.
//
// `toBaseMinor` is injected rather than imported so this stays a pure
// db-level function, testable without React — same as getNetWorthSeries.
//
// A closed fund reports 0 from its closedAt onward, and its real historical
// balance for any cutoff before that.
//
// Closing used to write a fixed balancing release row instead. That assumed
// the fund's state at close was final, and it wasn't: deleting a linked
// expense afterwards un-consumed the fund and handed the money straight
// back to a fund the user had already closed, where it silently counted
// toward Earmarked again. Deriving the clamp from closedAt can't drift that
// way, however the ledger changes later.
export function getFundBalances(
  db: Db,
  toBaseMinor: (amountMinor: number, currency: string) => number,
  asOfDate?: Date,
): Map<number, FundBalance> {
  const allocationRows = db
    .select({
      fundId: fundAllocations.fundId,
      total: sql<number>`coalesce(sum(${fundAllocations.amountMinor}), 0)`,
    })
    .from(fundAllocations)
    .where(asOfDate ? lt(fundAllocations.date, asOfDate) : undefined)
    .groupBy(fundAllocations.fundId)
    .all();

  // Grouped by currency as well as fund because each account's expenses are
  // recorded in that account's own currency and have to be converted
  // separately before they can be summed.
  const spendRows = db
    .select({
      fundId: transactions.fundId,
      currency: accounts.currency,
      total: sql<number>`coalesce(sum(${transactions.amountMinor}), 0)`,
    })
    .from(transactions)
    .innerJoin(accounts, eq(accounts.id, transactions.accountId))
    .where(
      and(
        isNotNull(transactions.fundId),
        // Backstop: fund_id is only ever written on expenses, but filtering
        // here too means a stray link on an income or transfer row could
        // never quietly corrupt a fund's balance.
        eq(transactions.type, "expense"),
        ...(asOfDate ? [lt(transactions.date, asOfDate)] : []),
      ),
    )
    .groupBy(transactions.fundId, accounts.currency)
    .all();

  const allocated = new Map<number, number>();
  for (const row of allocationRows) {
    allocated.set(row.fundId, row.total);
  }

  const spent = new Map<number, number>();
  for (const row of spendRows) {
    if (row.fundId == null) continue;
    spent.set(row.fundId, (spent.get(row.fundId) ?? 0) + toBaseMinor(row.total, row.currency));
  }

  // Every fund gets an entry, including ones with no activity at all, so
  // callers never have to special-case a missing key.
  const fundRows = db
    .select({ id: funds.id, status: funds.status, closedAt: funds.closedAt })
    .from(funds)
    .all();
  const balances = new Map<number, FundBalance>();
  for (const { id, status, closedAt } of fundRows) {
    const allocatedMinor = allocated.get(id) ?? 0;
    const spentMinor = spent.get(id) ?? 0;
    const consumedMinor = Math.min(allocatedMinor, spentMinor);
    const heldMinor = allocatedMinor - consumedMinor;
    // Exclusive, matching asOfDate's own semantics: a cutoff exactly at
    // closedAt means "up to but not including the close".
    const closedByCutoff =
      status === "closed" && closedAt != null && (asOfDate == null || asOfDate > closedAt);
    balances.set(id, {
      fundId: id,
      allocatedMinor,
      spentMinor,
      consumedMinor,
      heldMinor,
      fundedMinor: closedByCutoff ? 0 : heldMinor,
      overspentMinor: Math.max(0, spentMinor - allocatedMinor),
    });
  }
  return balances;
}

export function emptyFundBalance(fundId: number): FundBalance {
  return { fundId, ...EMPTY_BALANCE };
}

// Total earmarked wealth. Pure over an already-computed map so a screen
// showing both the per-fund figures and the total only queries once.
export function sumEarmarkedMinor(balances: Map<number, FundBalance>): number {
  let total = 0;
  for (const balance of balances.values()) total += balance.fundedMinor;
  return total;
}

export interface FundProgress {
  percent: number;
  /** Still to put aside. 0 once fully funded. */
  remainingMinor: number;
  /** Funded beyond target. 0 unless overfunded. */
  overMinor: number;
  isFullyFunded: boolean;
  isOverfunded: boolean;
}

// The one place that turns {target, balance} into progress, so the Funds
// list, the Fund detail screen and the Dashboard card share a calculation
// instead of three copies that could drift — same reasoning as the
// computeGoalProgress it replaces.
//
// Unlike that one, this guards a non-positive target: the form rejects it,
// but computeGoalProgress divided unconditionally and would return Infinity
// here, so the guard is deliberate rather than copied.
export function computeFundProgress(
  targetAmountMinor: number,
  balance: FundBalance,
): FundProgress {
  const funded = balance.fundedMinor;
  if (targetAmountMinor <= 0) {
    return {
      percent: 0,
      remainingMinor: 0,
      overMinor: funded,
      isFullyFunded: false,
      isOverfunded: funded > 0,
    };
  }
  return {
    percent: Math.min(100, Math.max(0, (funded / targetAmountMinor) * 100)),
    remainingMinor: Math.max(0, targetAmountMinor - funded),
    overMinor: Math.max(0, funded - targetAmountMinor),
    isFullyFunded: funded >= targetAmountMinor,
    isOverfunded: funded > targetAmountMinor,
  };
}

export type FundHistoryEntry =
  | {
      kind: "allocation";
      id: number;
      date: Date;
      /** Signed, base currency: positive = added, negative = released. */
      amountMinor: number;
      note: string | null;
    }
  | {
      kind: "spend";
      id: number;
      date: Date;
      /** Positive, in `currency` — the expense's own account currency. */
      amountMinor: number;
      currency: string;
      description: string | null;
      /**
       * Dated at or beyond the balance cutoff, so it has NOT been taken out
       * of the fund yet. Recurring commitments materialize months ahead, so
       * without flagging these the history would list ten instalments the
       * funded figure hasn't counted and appear not to add up.
       */
      isUpcoming: boolean;
    };

// How a fund reached its current amount, newest first. Deliberately a merge
// of the allocation ledger and the linked transactions rather than a
// dedicated history table: spending already *is* a financial record, and
// copying it into a second table is exactly the duplication that lets two
// sources of truth drift apart.
//
// Spend amounts stay in the expense's own currency here — this is a display
// list, so showing what was actually spent beats showing a converted
// figure that would silently change with tomorrow's exchange rate.
export function getFundHistory(db: Db, fundId: number, asOfDate?: Date): FundHistoryEntry[] {
  const allocationRows = db
    .select()
    .from(fundAllocations)
    .where(eq(fundAllocations.fundId, fundId))
    .all();

  const spendRows = db
    .select({
      id: transactions.id,
      date: transactions.date,
      amountMinor: transactions.amountMinor,
      description: transactions.description,
      currency: accounts.currency,
    })
    .from(transactions)
    .innerJoin(accounts, eq(accounts.id, transactions.accountId))
    .where(and(eq(transactions.fundId, fundId), eq(transactions.type, "expense")))
    .all();

  const entries: FundHistoryEntry[] = [
    ...allocationRows.map((row) => ({
      kind: "allocation" as const,
      id: row.id,
      date: row.date,
      amountMinor: row.amountMinor,
      note: row.note,
    })),
    ...spendRows.map((row) => ({
      kind: "spend" as const,
      id: row.id,
      date: row.date,
      amountMinor: row.amountMinor,
      currency: row.currency,
      description: row.description,
      // Same cutoff getFundBalances uses, so what the list marks as still
      // to come is exactly what the funded figure hasn't subtracted.
      isUpcoming: asOfDate != null && row.date >= asOfDate,
    })),
  ];

  return entries.sort((a, b) => b.date.getTime() - a.date.getTime());
}

// The account currencies fund-linked expenses are recorded in, so a screen
// showing fund totals can hand them to useBaseConverter and disclose any
// that have no exchange rate yet. A missing rate makes toBaseMinor return
// 0, which understates spending and so *overstates* what's earmarked — the
// conservative direction, but still worth saying out loud rather than
// showing a confidently wrong figure.
export function getFundLinkedCurrencies(db: Db): string[] {
  const rows = db
    .selectDistinct({ currency: accounts.currency })
    .from(transactions)
    .innerJoin(accounts, eq(accounts.id, transactions.accountId))
    .where(and(isNotNull(transactions.fundId), eq(transactions.type, "expense")))
    .all();
  return rows.map((row) => row.currency);
}
