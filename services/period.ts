export interface MonthPeriod {
  year: number;
  month: number; // 0-11
}

export function currentMonthPeriod(): MonthPeriod {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

export function monthRange({ year, month }: MonthPeriod): { start: Date; end: Date } {
  return {
    start: new Date(year, month, 1),
    end: new Date(year, month + 1, 1),
  };
}

export function shiftMonth({ year, month }: MonthPeriod, delta: number): MonthPeriod {
  const date = new Date(year, month + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() };
}

export function monthLabel({ year, month }: MonthPeriod): string {
  return new Date(year, month, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

// e.g. "Aug '26" — compact enough for chart axis labels.
export function monthShortLabel({ year, month }: MonthPeriod): string {
  const label = new Date(year, month, 1).toLocaleDateString("en-IN", { month: "short" });
  return `${label} '${String(year).slice(-2)}`;
}

export function monthsBetween(a: MonthPeriod, b: MonthPeriod): number {
  return (b.year - a.year) * 12 + (b.month - a.month);
}

// Only meaningful while actually viewing the real current month — "X days
// left, Y/day" doesn't mean anything when browsing a past or future month,
// so callers get null there and should just skip the safe-to-spend line
// rather than show a stale/misleading figure.
export function daysRemainingInMonth(period: MonthPeriod): number | null {
  const now = new Date();
  if (now.getFullYear() !== period.year || now.getMonth() !== period.month) return null;
  const daysInMonth = new Date(period.year, period.month + 1, 0).getDate();
  return daysInMonth - now.getDate() + 1;
}

// Local-calendar "YYYY-MM-DD", deliberately not `Date#toISOString()` — that
// converts to UTC, which shifts the date backward a day for any positive
// UTC offset (e.g. IST, UTC+5:30), the common case for this app's market.
export function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Inverse of toLocalDateString — parses "YYYY-MM-DD" as local midnight.
// `new Date("YYYY-MM-DD")` parses as UTC midnight instead, which shifts to
// the previous day when displayed in a negative-UTC-offset timezone.
export function parseLocalDateString(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}
