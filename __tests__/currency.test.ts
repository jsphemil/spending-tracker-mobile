import { eq } from "drizzle-orm";

import { exchangeRateCache } from "../db/schema";
import { getExchangeRate } from "../services/currency";
import { closeTestDb, createTestDb, type TestDb } from "./testDb";

let db: TestDb;

beforeEach(() => {
  db = createTestDb();
  global.fetch = jest.fn(async () => ({
    ok: true,
    json: async () => ({ rates: { INR: 22.5 } }),
  })) as unknown as typeof fetch;
});

afterEach(() => {
  closeTestDb(db);
  jest.restoreAllMocks();
});

describe("getExchangeRate", () => {
  it("returns 1 for the same currency without calling the API", async () => {
    const rate = await getExchangeRate(db, "INR", "INR");
    expect(rate).toBe(1);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("fetches and caches the rate on a cache miss", async () => {
    const rate = await getExchangeRate(db, "AED", "INR");
    expect(rate).toBe(22.5);
    expect(fetch).toHaveBeenCalledTimes(1);

    const cached = db
      .select()
      .from(exchangeRateCache)
      .where(eq(exchangeRateCache.baseCurrency, "AED"))
      .get();
    expect(cached?.rate).toBe(22.5);
  });

  it("reuses a fresh cache entry instead of calling the API again", async () => {
    await getExchangeRate(db, "AED", "INR");
    const rate = await getExchangeRate(db, "AED", "INR");

    expect(rate).toBe(22.5);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("refetches once the cache entry is older than the TTL", async () => {
    await getExchangeRate(db, "AED", "INR");

    const sevenHoursAgo = new Date(Date.now() - 7 * 60 * 60 * 1000);
    db.update(exchangeRateCache)
      .set({ fetchedAt: sevenHoursAgo })
      .where(eq(exchangeRateCache.baseCurrency, "AED"))
      .run();

    await getExchangeRate(db, "AED", "INR");
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
