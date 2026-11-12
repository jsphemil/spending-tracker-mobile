import { currentMonthPeriod, financialYear, monthRange } from "./period";

export type BudgetPeriod = "month" | "year";

// The stretch a category budget covers right now: this calendar month, or
// the financial year containing today (settings.fyStartMonth).
export function budgetRange(period: BudgetPeriod, fyStartMonth: number, today = new Date()): { start: Date; end: Date } {
  return period === "year" ? financialYear(today, fyStartMonth) : monthRange(currentMonthPeriod());
}

// Net spending per expense category, in base currency. Refunds are negative
// expenses, so they reduce the total automatically.
export function spendByCategory(
  rows: readonly { type: string; categoryId: number | null; accountId: number; amountMinor: number }[],
  currencyOf: (accountId: number) => string,
  toBaseMinor: (amountMinor: number, currency: string) => number,
): Map<number, number> {
  const totals = new Map<number, number>();
  for (const t of rows) {
    if (t.type !== "expense" || t.categoryId === null) continue;
    totals.set(t.categoryId, (totals.get(t.categoryId) ?? 0) + toBaseMinor(t.amountMinor, currencyOf(t.accountId)));
  }
  return totals;
}
