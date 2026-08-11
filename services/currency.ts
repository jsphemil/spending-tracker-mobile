import { and, eq } from "drizzle-orm";

import type { Db } from "../db/client";
import { exchangeRateCache } from "../db/schema";

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

// Confirmed against the live API 2026-08-12 — the endpoint this file used
// to call (/v2/latest?base=X&symbols=Y) 404s. The real v2 shape is
// /v2/rates?base=INR&quotes=X,Y, returning an array of
// {date, base, quote, rate} records (not a {rates: {...}} object) where
// `rate` is "1 INR = X <quote>" — the inverse of what this file wants, so
// every fetched rate gets inverted before caching. Matches the source web
// app's services/currency.ts exactly (getRatesToINR).
const FRANKFURTER_RATES_URL = "https://api.frankfurter.dev/v2/rates";

interface CachedRow {
  id: number;
  rate: number;
  fetchedAt: Date;
}

function isFresh(row: CachedRow): boolean {
  return Date.now() - row.fetchedAt.getTime() < CACHE_TTL_MS;
}

// Batches every non-INR currency needed into one Frankfurter call rather
// than one call per currency. Returns "1 unit of currency = X INR" for
// each. On a cache miss + API failure, falls back to the last-known cached
// rate (however stale) instead of throwing — an external API being briefly
// unavailable shouldn't crash a screen or silently treat a currency as 1:1.
export async function getRatesToINR(
  db: Db,
  currencies: string[],
): Promise<Record<string, number>> {
  const unique = [...new Set(currencies)].filter((c) => c !== "INR");
  if (unique.length === 0) return {};

  const cachedRows = db
    .select()
    .from(exchangeRateCache)
    .where(eq(exchangeRateCache.targetCurrency, "INR"))
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
    const url = `${FRANKFURTER_RATES_URL}?base=INR&quotes=${stale.join(",")}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Frankfurter API request failed: ${response.status}`);
    }
    const data = (await response.json()) as { base: string; quote: string; rate: number }[];

    for (const { quote, rate } of data) {
      const rateToInr = 1 / rate;
      result[quote] = rateToInr;
      const existing = cachedByCurrency.get(quote);
      if (existing) {
        db.update(exchangeRateCache)
          .set({ rate: rateToInr, fetchedAt: new Date() })
          .where(eq(exchangeRateCache.id, existing.id))
          .run();
      } else {
        db.insert(exchangeRateCache)
          .values({ baseCurrency: quote, targetCurrency: "INR", rate: rateToInr, fetchedAt: new Date() })
          .run();
      }
    }
  } catch {
    // Network/API failure — fall through to the stale-cache fallback below
    // rather than crashing whatever screen asked for this.
  }

  // Anything still missing (API down and never cached, or errored this
  // time) falls back to its last-known cached rate, however old, rather
  // than silently treating the currency as 1:1 with INR.
  for (const currency of stale) {
    if (currency in result) continue;
    const row = cachedByCurrency.get(currency);
    if (row) result[currency] = row.rate;
  }

  return result;
}

// Thin wrapper over getRatesToINR for the common "convert amount from one
// currency to another" call shape used across the app (CurrencyAmount,
// Dashboard, tag summaries). Only INR<->foreign and foreign<->foreign (via
// INR) are meaningful here; base===target is handled without any lookup.
export async function getExchangeRate(db: Db, base: string, target: string): Promise<number> {
  if (base === target) return 1;

  const needed = [base, target].filter((c) => c !== "INR");
  const rates = await getRatesToINR(db, needed);

  const baseToInr = base === "INR" ? 1 : rates[base];
  const targetToInr = target === "INR" ? 1 : rates[target];
  if (baseToInr === undefined || targetToInr === undefined) {
    throw new Error(`No exchange rate available for ${base}->${target}`);
  }
  return baseToInr / targetToInr;
}
