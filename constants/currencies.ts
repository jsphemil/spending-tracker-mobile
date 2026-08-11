// Quick-pick list for AccountForm's currency field — matches
// services/format.ts's CURRENCY_SYMBOLS (the ones with a real symbol
// instead of falling back to the 3-letter code). Any other ISO code can
// still be typed manually in the field below the pills.
export const CURRENCY_OPTIONS = [
  { code: "INR", label: "₹ INR" },
  { code: "USD", label: "$ USD" },
  { code: "EUR", label: "€ EUR" },
  { code: "GBP", label: "£ GBP" },
  { code: "AED", label: "AED" },
  { code: "JPY", label: "¥ JPY" },
] as const;
