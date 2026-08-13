import { and, eq } from "drizzle-orm";

import type { Db } from "../db/client";
import { exchangeRateCache } from "../db/schema";

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
}

const FRANKFURTER_CURRENCIES_URL = "https://api.frankfurter.dev/v2/currencies";

// In-memory only (not persisted to SQLite) — this list is effectively
// static within a single app session, so a per-launch fetch is enough;
// no TTL/staleness logic needed the way exchange rates require. Falls
// back to a small hardcoded list on failure so the currency picker never
// ends up completely empty.
let supportedCurrenciesCache: CurrencyInfo[] | null = null;

const FALLBACK_CURRENCIES: CurrencyInfo[] = [
  { code: "INR", name: "Indian Rupee", symbol: "₹" },
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥" },
];

export async function getSupportedCurrencies(): Promise<CurrencyInfo[]> {
  if (supportedCurrenciesCache) return supportedCurrenciesCache;

  try {
    const response = await fetch(FRANKFURTER_CURRENCIES_URL);
    if (!response.ok) throw new Error(`Frankfurter API request failed: ${response.status}`);
    const data = (await response.json()) as { iso_code: string; name: string; symbol: string }[];
    supportedCurrenciesCache = data
      .map((c) => ({ code: c.iso_code, name: c.name, symbol: c.symbol }))
      .sort((a, b) => a.code.localeCompare(b.code));
    return supportedCurrenciesCache;
  } catch {
    return FALLBACK_CURRENCIES;
  }
}

// Confirmed against the live API 2026-08-12 (for base=INR) — the endpoint
// this file used to call (/v2/latest?base=X&symbols=Y) 404s. The real v2
// shape is /v2/rates?base=X&quotes=Y,Z, returning an array of
// {date, base, quote, rate} records (not a {rates: {...}} object) where
// `rate` is "1 base = X quote" — already the direction this file wants, no
// inversion needed. Frankfurter's base currency is a normal query param
// (not INR-specific), so this generalizes to any app-chosen base currency
// per spec.md §5.13's "base currency is a live setting" requirement.
const FRANKFURTER_RATES_URL = "https://api.frankfurter.dev/v2/rates";

interface CachedRow {
  id: number;
  rate: number;
  fetchedAt: Date;
}

function isFresh(row: CachedRow): boolean {
  return Date.now() - row.fetchedAt.getTime() < CACHE_TTL_MS;
}

// Batches every currency needed into one Frankfurter call rather than one
// call per currency. Returns "1 unit of currency = X baseCurrency" for
// each. On a cache miss + API failure, falls back to the last-known cached
// rate (however stale) instead of throwing — an external API being briefly
// unavailable shouldn't crash a screen or silently treat a currency as 1:1.
// Cache rows are keyed by `targetCurrency`, so switching the app's base
// currency naturally starts a fresh set of rows instead of needing an
// explicit cache-invalidation step.
export async function getRatesToBase(
  db: Db,
  currencies: string[],
  baseCurrency: string,
): Promise<Record<string, number>> {
  const unique = [...new Set(currencies)].filter((c) => c !== baseCurrency);
  if (unique.length === 0) return {};

  const cachedRows = db
    .select()
    .from(exchangeRateCache)
    .where(eq(exchangeRateCache.targetCurrency, baseCurrency))
    .all()
    .filter((row) => unique.includes(row.baseCurrency));
  const cachedByCurrency = new Map(cachedRows.map((row) => [row.baseCurrency, row]));

  const result: Record<string, number> = {};
  const stale: string[] = [];
  for (const currency of unique) {
    const row = cachedByCurrency.get(currency);
    if (row && isFresh(row)) {
      result[currency] = row.rate;
    } else {
      stale.push(currency);
    }
  }

  if (stale.length === 0) return result;

  try {
    const url = `${FRANKFURTER_RATES_URL}?base=${baseCurrency}&quotes=${stale.join(",")}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Frankfurter API request failed: ${response.status}`);
    }
    const data = (await response.json()) as { base: string; quote: string; rate: number }[];

    for (const { quote, rate } of data) {
      // Frankfurter returns "1 base = rate quote"; this cache/result shape
      // wants the inverse, "1 quote = X base".
      const rateToBase = 1 / rate;
      result[quote] = rateToBase;
      const existing = cachedByCurrency.get(quote);
      if (existing) {
        db.update(exchangeRateCache)
          .set({ rate: rateToBase, fetchedAt: new Date() })
          .where(eq(exchangeRateCache.id, existing.id))
          .run();
      } else {
        db.insert(exchangeRateCache)
          .values({ baseCurrency: quote, targetCurrency: baseCurrency, rate: rateToBase, fetchedAt: new Date() })
          .run();
      }
    }
  } catch {
    // Network/API failure — fall through to the stale-cache fallback below
    // rather than crashing whatever screen asked for this.
  }

  // Anything still missing (API down and never cached, or errored this
  // time) falls back to its last-known cached rate, however old, rather
  // than silently treating the currency as 1:1 with the base.
  for (const currency of stale) {
    if (currency in result) continue;
    const row = cachedByCurrency.get(currency);
    if (row) result[currency] = row.rate;
  }

  return result;
}

// Thin wrapper over getRatesToBase for the common "convert amount from one
// currency to another" call shape used across the app (CurrencyAmount,
// Dashboard, tag summaries). `target` is used directly as the pivot — a
// single Frankfurter call returns "1 base = X target" with no second hop
// needed, unlike the old INR-pivoted implementation.
export async function getExchangeRate(db: Db, base: string, target: string): Promise<number> {
  if (base === target) return 1;

  const rates = await getRatesToBase(db, [base], target);
  const rate = rates[base];
  if (rate === undefined) {
    throw new Error(`No exchange rate available for ${base}->${target}`);
  }
  return rate;
}
