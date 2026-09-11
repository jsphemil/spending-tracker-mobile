// Cumulative spend, day by day (spec.md §5.22 "Analytics"). Pure — the
// caller supplies the month's transaction rows, the accounts (for each
// row's currency) and the base-currency converter, and gets back one
// running total per day of the month, in base-currency minor units.
// Expenses only, transfers excluded — the same rule getPeriodTotals uses.

export interface SpendRow {
  type: string;
  accountId: number;
  amountMinor: number;
  date: Date;
}

export interface AccountCurrency {
  id: number;
  currency: string;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

// Index i holds the total spent through the end of day i+1. A month with
// no expenses is an array of zeros of the right length, never empty, so
// two months always plot against the same x axis.
export function cumulativeDailySpend(
  rows: SpendRow[],
  accounts: AccountCurrency[],
  toBaseMinor: (amountMinor: number, currency: string) => number,
  { year, month, fallbackCurrency }: { year: number; month: number; fallbackCurrency: string },
): number[] {
  const days = daysInMonth(year, month);
  const perDay = new Array<number>(days).fill(0);
  const currencyOf = new Map(accounts.map((a) => [a.id, a.currency]));

  for (const row of rows) {
    if (row.type !== "expense") continue;
    if (row.date.getFullYear() !== year || row.date.getMonth() !== month) continue;
    const day = row.date.getDate();
    perDay[day - 1] += toBaseMinor(row.amountMinor, currencyOf.get(row.accountId) ?? fallbackCurrency);
  }

  let running = 0;
  return perDay.map((v) => (running += v));
}

// How far this month's running total sits from last month's at the same
// day. Positive = spent more than last month by that point.
export function spendGapAtDay(thisMonth: number[], lastMonth: number[], day: number): number {
  const at = (series: number[]) => series[Math.min(Math.max(day, 1), series.length) - 1] ?? 0;
  return at(thisMonth) - at(lastMonth);
}
