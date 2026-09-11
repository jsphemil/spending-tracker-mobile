import { cumulativeDailySpend, daysInMonth, spendGapAtDay } from "../services/cumulativeSpend";

const accounts = [
  { id: 1, currency: "INR" },
  { id: 2, currency: "AED" },
];
// 1 AED = 22 INR for the test; INR passes through.
const toBase = (amountMinor: number, currency: string) => (currency === "AED" ? amountMinor * 22 : amountMinor);
const sep = { year: 2026, month: 8, fallbackCurrency: "INR" };

describe("cumulativeDailySpend", () => {
  it("returns a zero series of the month's length for an empty month", () => {
    const series = cumulativeDailySpend([], accounts, toBase, sep);
    expect(series).toHaveLength(30);
    expect(series.every((v) => v === 0)).toBe(true);
    expect(daysInMonth(2026, 1)).toBe(28);
    expect(daysInMonth(2028, 1)).toBe(29);
  });

  it("accumulates expenses by day and carries the total forward", () => {
    const rows = [
      { type: "expense", accountId: 1, amountMinor: 10_000, date: new Date(2026, 8, 3) },
      { type: "expense", accountId: 1, amountMinor: 5_000, date: new Date(2026, 8, 3, 18) },
      { type: "expense", accountId: 1, amountMinor: 2_000, date: new Date(2026, 8, 10) },
    ];
    const series = cumulativeDailySpend(rows, accounts, toBase, sep);
    expect(series[0]).toBe(0);
    expect(series[1]).toBe(0);
    expect(series[2]).toBe(15_000);
    expect(series[8]).toBe(15_000);
    expect(series[9]).toBe(17_000);
    expect(series[29]).toBe(17_000);
  });

  it("excludes income and transfers, and converts foreign-currency accounts", () => {
    const rows = [
      { type: "income", accountId: 1, amountMinor: 99_999, date: new Date(2026, 8, 1) },
      { type: "transfer", accountId: 1, amountMinor: 99_999, date: new Date(2026, 8, 1) },
      { type: "expense", accountId: 2, amountMinor: 100, date: new Date(2026, 8, 1) },
    ];
    const series = cumulativeDailySpend(rows, accounts, toBase, sep);
    expect(series[0]).toBe(2_200);
    expect(series[29]).toBe(2_200);
  });

  it("ignores rows outside the month rather than indexing out of range", () => {
    const rows = [{ type: "expense", accountId: 1, amountMinor: 1, date: new Date(2026, 9, 1) }];
    expect(cumulativeDailySpend(rows, accounts, toBase, sep).every((v) => v === 0)).toBe(true);
  });
});

describe("spendGapAtDay", () => {
  it("compares the two running totals at the same day, clamped to each series", () => {
    const a = [10, 20, 30];
    const b = [5, 25, 25, 40];
    expect(spendGapAtDay(a, b, 2)).toBe(-5);
    expect(spendGapAtDay(a, b, 4)).toBe(30 - 40);
    expect(spendGapAtDay(a, b, 0)).toBe(5);
  });
});
