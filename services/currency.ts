import { and, eq } from "drizzle-orm";

import type { Db } from "../db/client";
import { exchangeRateCache } from "../db/schema";

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

// api.frankfurter.dev v2 (not v1/ECB-only) — sources from 84 central banks,
// covers AED and other non-major currencies spec.md §5.1 requires.
const FRANKFURTER_BASE_URL = "https://api.frankfurter.dev/v2/latest";

export async function getExchangeRate(
  db: Db,
  base: string,
  target: string,
): Promise<number> {
  if (base === target) return 1;

  const cached = db
    .select()
    .from(exchangeRateCache)
    .where(
      and(
        eq(exchangeRateCache.baseCurrency, base),
        eq(exchangeRateCache.targetCurrency, target),
      ),
    )
    .get();

  if (cached && Date.now() - cached.fetchedAt.getTime() < CACHE_TTL_MS) {
    return cached.rate;
  }

  const rate = await fetchExchangeRate(base, target);

  if (cached) {
    db.update(exchangeRateCache)
      .set({ rate, fetchedAt: new Date() })
      .where(eq(exchangeRateCache.id, cached.id))
      .run();
  } else {
    db.insert(exchangeRateCache)
      .values({ baseCurrency: base, targetCurrency: target, rate, fetchedAt: new Date() })
      .run();
  }

  return rate;
}

async function fetchExchangeRate(base: string, target: string): Promise<number> {
  const url = `${FRANKFURTER_BASE_URL}?base=${base}&symbols=${target}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Frankfurter API request failed: ${response.status}`);
  }
  const data = (await response.json()) as { rates: Record<string, number> };
  const rate = data.rates[target];
  if (typeof rate !== "number") {
    throw new Error(`No exchange rate returned for ${base}->${target}`);
  }
  return rate;
}
