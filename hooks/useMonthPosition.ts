import { useEffect, useMemo } from "react";

import { db } from "../db/client";
import { useAccounts } from "../db/queries/accounts";
import { useFundAllocationsSubscription } from "../db/queries/funds";
import { useFilteredTransactions } from "../db/queries/transactions";
import { getAccountBalanceMinor, getPeriodTotals } from "../services/balance";
import { getFundBalances, getFundLinkedCurrencies, sumEarmarkedMinor } from "../services/funds";
import { monthRange, shiftMonth, type MonthPeriod } from "../services/period";
import { ensureMaterialized } from "../services/recurrence";
import { useBaseConverter } from "./useBaseConverter";

const ASSET_TYPES = ["savings", "wallet", "deposit", "investment"] as const;

// The Dashboard's position and month figures (spec.md §5.19/§5.24), moved
// here verbatim from app/(tabs)/index.tsx so the Dashboard and the Net
// worth detail screen read exactly the same numbers. No new formulas:
// every figure is the existing services/balance.ts and services/funds.ts
// calculation, composed the same way it was on the V2 Dashboard. The two
// V4 additions — netWorthChangeMinor and the like-for-like spending pair —
// are the same getAccountBalanceMinor/getPeriodTotals calls over
// different cutoffs.
export function useMonthPosition(period: MonthPeriod) {
  const { data: accounts } = useAccounts();
  const range = useMemo(() => monthRange(period), [period]);
  useEffect(() => {
    ensureMaterialized(db, { through: range.end });
  }, [range.end]);

  // Fund-linked expenses are recorded in their account's currency, so those
  // currencies have to reach the converter too — otherwise a fund spent
  // from a foreign account would silently value that spending at 0.
  const linkedFundCurrencies = getFundLinkedCurrencies(db);
  const { toBaseMinor, unconvertedCurrencies } = useBaseConverter([
    ...(accounts ?? []).map((a) => a.currency),
    ...linkedFundCurrencies,
  ]);

  // ---- POSITION (as of the viewed month) ----
  // `range.end` is required, not optional polish: getAccountBalanceMinor
  // with no cutoff sums an account's *entire* history, which includes
  // already-materialized future-dated recurring transactions (next month's
  // salary, etc.) and silently overstates net worth. It also has to be
  // range.end rather than a "now" timestamp so this figure keeps tracking
  // the month navigation, and so it agrees with the Accounts and Analytics
  // screens, which both already pass range.end.
  const accountBalanceAsOf = new Map(
    (accounts ?? []).map((a) => [a.id, getAccountBalanceMinor(db, a.id, range.end)]),
  );
  let netWorthMinor = 0;
  let assetsMinor = 0;
  let debtMinor = 0;
  for (const account of accounts ?? []) {
    const baseBalance = toBaseMinor(accountBalanceAsOf.get(account.id) ?? 0, account.currency);
    netWorthMinor += baseBalance;
    if (account.type === "credit_card") {
      if (baseBalance < 0) debtMinor += -baseBalance;
    } else if ((ASSET_TYPES as readonly string[]).includes(account.type) && baseBalance > 0) {
      assetsMinor += baseBalance;
    }
  }

  // Funds (spec.md §5.21). Subscribed for the repaint, not the rows:
  // getFundBalances is a synchronous read, and useFunds() alone only
  // repaints when a fund row itself changes — so adding or releasing money
  // left these figures stale until something else forced a render.
  useFundAllocationsSubscription();
  // Same range.end cutoff as net worth above, so the
  // three figures stay arithmetically consistent as the month-nav moves —
  // a today-anchored Earmarked against a range.end net worth would make the
  // subtraction on screen visibly wrong.
  const fundBalances = getFundBalances(db, toBaseMinor, range.end);
  const earmarkedMinor = sumEarmarkedMinor(fundBalances);
  // Not clamped at zero: earmarking more than you have is real information,
  // and it gets its own attention row on the Dashboard.
  const unallocatedMinor = netWorthMinor - earmarkedMinor;

  // ---- PERFORMANCE (viewed month) ----
  // Subscribed for its re-render, not its rows: the income/expense figures
  // below come from getPeriodTotals, a plain synchronous read that isn't
  // reactive on its own. Deliberately called for the subscription alone —
  // don't "clean up" the bare call.
  useFilteredTransactions({ range });
  // Like-for-like spending comparison: the first `days` days of this month
  // against the same days of last month (capped at last month's length), so
  // a month in progress isn't compared with a whole finished one. For a
  // past month, `days` is the whole month.
  const now = new Date();
  const isCurrentMonth = now.getFullYear() === period.year && now.getMonth() === period.month;
  const days = isCurrentMonth ? now.getDate() : Math.round((range.end.getTime() - range.start.getTime()) / 86400000);
  const toDate = { start: range.start, end: new Date(period.year, period.month, days + 1) };
  const lastRange = monthRange(shiftMonth(period, -1));
  const lastToDate = {
    start: lastRange.start,
    end: new Date(Math.min(
      new Date(lastRange.start.getFullYear(), lastRange.start.getMonth(), days + 1).getTime(),
      lastRange.end.getTime(),
    )),
  };
  let incomeMinor = 0;
  let expenseMinor = 0;
  let carryForwardMinor = 0;
  let expenseToDateMinor = 0;
  let lastMonthSameDaysExpenseMinor = 0;
  for (const account of accounts ?? []) {
    const totals = getPeriodTotals(db, { accountId: account.id, ...range });
    incomeMinor += toBaseMinor(totals.incomeMinor, account.currency);
    expenseMinor += toBaseMinor(totals.expenseMinor, account.currency);
    carryForwardMinor += toBaseMinor(getAccountBalanceMinor(db, account.id, range.start), account.currency);
    expenseToDateMinor += toBaseMinor(getPeriodTotals(db, { accountId: account.id, ...toDate }).expenseMinor, account.currency);
    lastMonthSameDaysExpenseMinor += toBaseMinor(
      getPeriodTotals(db, { accountId: account.id, ...lastToDate }).expenseMinor,
      account.currency,
    );
  }
  const availableThisMonthMinor = carryForwardMinor + incomeMinor - expenseMinor;
  // Carry forward is net worth as of the month's start (the same balances,
  // cut off at range.start), so this is how net worth moved over the month.
  const netWorthChangeMinor = netWorthMinor - carryForwardMinor;

  return {
    accounts,
    range,
    toBaseMinor,
    unconvertedCurrencies,
    netWorthMinor,
    netWorthChangeMinor,
    assetsMinor,
    debtMinor,
    fundBalances,
    earmarkedMinor,
    unallocatedMinor,
    incomeMinor,
    expenseMinor,
    comparisonDays: days,
    expenseToDateMinor,
    lastMonthSameDaysExpenseMinor,
    carryForwardMinor,
    availableThisMonthMinor,
  };
}
