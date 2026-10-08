import { cumulativeRangeSpend } from "../services/cumulativeSpend";
import { calendarDaysBetween, customRanges } from "../services/period";

// Analytics custom date range (spec.md §5.24).
describe("customRanges", () => {
  it("treats To as inclusive and compares with the equally long stretch before", () => {
    const r = customRanges(new Date(2026, 7, 15, 13), new Date(2026, 8, 13, 9));
    expect(r.days).toBe(30);
    expect(r.current).toEqual({ start: new Date(2026, 7, 15), end: new Date(2026, 8, 14) });
    expect(r.previous).toEqual({ start: new Date(2026, 6, 16), end: new Date(2026, 7, 15) });
  });

  it("a single day compares with the day before", () => {
    const r = customRanges(new Date(2026, 2, 1), new Date(2026, 2, 1));
    expect(r.days).toBe(1);
    expect(r.previous).toEqual({ start: new Date(2026, 1, 28), end: new Date(2026, 2, 1) });
  });

  it("counts calendar days, not 24-hour blocks", () => {
    expect(calendarDaysBetween(new Date(2026, 0, 1, 23), new Date(2026, 0, 2, 1))).toBe(1);
  });
});

describe("cumulativeRangeSpend", () => {
  const accounts = [{ id: 1, currency: "INR" }, { id: 2, currency: "AED" }];
  const toBase = (m: number, c: string) => (c === "AED" ? m * 22 : m);
  const { current } = customRanges(new Date(2026, 7, 30), new Date(2026, 8, 2)); // 30 Aug – 2 Sep

  it("buckets expenses by day across a month boundary, ignoring income, transfers and rows outside", () => {
    const rows = [
      { type: "expense", accountId: 1, amountMinor: 100, date: new Date(2026, 7, 30, 10) },
      { type: "expense", accountId: 2, amountMinor: 10, date: new Date(2026, 8, 1, 20) },
      { type: "income", accountId: 1, amountMinor: 999, date: new Date(2026, 8, 1) },
      { type: "transfer", accountId: 1, amountMinor: 999, date: new Date(2026, 8, 1) },
      { type: "expense", accountId: 1, amountMinor: 999, date: new Date(2026, 7, 29, 23) },
      { type: "expense", accountId: 1, amountMinor: 999, date: new Date(2026, 8, 3) },
    ];
    expect(cumulativeRangeSpend(rows, accounts, toBase, { ...current, fallbackCurrency: "INR" })).toEqual([
      100, 100, 320, 320,
    ]);
  });
});
