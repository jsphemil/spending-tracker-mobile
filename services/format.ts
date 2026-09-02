// Currencies whose smallest unit isn't 2 decimal places. Everything not
// listed here (INR, AED, USD, EUR, ...) defaults to 2.
const ZERO_DECIMAL_CURRENCIES = new Set(["JPY", "KRW", "VND"]);

export function minorUnitsFor(currency: string): number {
  return ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase()) ? 0 : 2;
}

export function minorToMajor(amountMinor: number, currency: string): number {
  const decimals = minorUnitsFor(currency);
  return amountMinor / 10 ** decimals;
}

export function majorToMinor(amountMajor: number, currency: string): number {
  const decimals = minorUnitsFor(currency);
  return Math.round(amountMajor * 10 ** decimals);
}

// Device-locale digit grouping (spec.md §5.19 "Global country-neutral
// requirement") — previously hardcoded to "en-IN" (Indian lakh/crore
// comma placement) for every currency and every user, which was fine for
// this app's original India-only audience but wrong for a global one. A
// formatting change only: minorToMajor/majorToMinor and the underlying
// stored amounts are untouched.
export function formatMoney(amountMinor: number, currency: string): string {
  const major = minorToMajor(amountMinor, currency);
  const decimals = minorUnitsFor(currency);
  const formatted = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Math.abs(major));
  const sign = major < 0 ? "-" : "";
  return `${sign}${currencySymbol(currency)}${formatted}`;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
  AED: "AED ",
  JPY: "¥",
};

export function currencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency.toUpperCase()] ?? `${currency.toUpperCase()} `;
}

function trimTrailingZero(n: number): string {
  return n.toFixed(1).replace(/\.0$/, "");
}

// Compact axis-label formatting for charts (e.g. the Dashboard's net worth
// trend Y-axis) — "₹14L" not "₹14,00,000.00". Indian lakh/crore for INR,
// matching the real app's chart labels; a generic K/M/B abbreviation for
// everything else. Chart-label use only — regular money display always
// stays on formatMoney's full Indian-grouped format per spec.md §5.4.
export function formatCompactMoney(amountMinor: number, currency: string): string {
  const major = minorToMajor(amountMinor, currency);
  const abs = Math.abs(major);
  const sign = major < 0 ? "-" : "";
  const symbol = currencySymbol(currency);

  if (currency.toUpperCase() === "INR") {
    if (abs >= 1e7) return `${sign}${symbol}${trimTrailingZero(abs / 1e7)}Cr`;
    if (abs >= 1e5) return `${sign}${symbol}${trimTrailingZero(abs / 1e5)}L`;
    if (abs >= 1e3) return `${sign}${symbol}${trimTrailingZero(abs / 1e3)}K`;
    return `${sign}${symbol}${Math.round(abs)}`;
  }

  if (abs >= 1e9) return `${sign}${symbol}${trimTrailingZero(abs / 1e9)}B`;
  if (abs >= 1e6) return `${sign}${symbol}${trimTrailingZero(abs / 1e6)}M`;
  if (abs >= 1e3) return `${sign}${symbol}${trimTrailingZero(abs / 1e3)}K`;
  return `${sign}${symbol}${Math.round(abs)}`;
}
