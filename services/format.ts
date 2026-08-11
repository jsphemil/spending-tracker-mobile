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

// Indian numbering system (₹1,53,168.00), used throughout per spec.md §5.4.
export function formatMoney(amountMinor: number, currency: string): string {
  const major = minorToMajor(amountMinor, currency);
  const decimals = minorUnitsFor(currency);
  const formatted = new Intl.NumberFormat("en-IN", {
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
