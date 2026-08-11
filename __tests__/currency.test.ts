import { eq } from "drizzle-orm";

import { exchangeRateCache } from "../db/schema";
import { getExchangeRate, getRatesToINR } from "../services/currency";
import { closeTestDb, createTestDb, type TestDb } from "./testDb";

let db: TestDb;

// Frankfurter's real v2 shape (confirmed against the live API 2026-08-12):
// /v2/rates?base=INR&quotes=X,Y returns an array of {date,base,quote,rate}
// records where rate is "1 INR = X <quote>" — the app inverts this to get
// "1 <quote> = X INR". The endpoint this file used to call (/v2/latest)
// 404s against the real API; these tests exercise the corrected shape.
function mockFrankfurter(quotesToRate: Record<string, number>) {
  global.fetch = jest.fn(async () => ({
    ok: true,
    json: async () =>
      Object.entries(quotesToRate).map(([quote, rate]) => ({ date: "2026-08-12", base: "INR", quote, rate })),
  })) as unknown as typeof fetch;
}

beforeEach(() => {
  db = createTestDb();
  // 1 INR = 0.0444... AED  =>  1 AED = 22.5 INR
  mockFrankfurter({ AED: 1 / 22.5 });
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

  it("fetches, inverts, and caches the rate on a cache miss", async () => {
    const rate = await getExchangeRate(db, "AED", "INR");
    expect(rate).toBeCloseTo(22.5);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect((fetch as jest.Mock).mock.calls[0][0]).toContain("/v2/rates?base=INR&quotes=AED");

    const cached = db
      .select()
      .from(exchangeRateCache)
      .where(eq(exchangeRateCache.baseCurrency, "AED"))
      .get();
    expect(cached?.rate).toBeCloseTo(22.5);
  });

  it("reuses a fresh cache entry instead of calling the API again", async () => {
    await getExchangeRate(db, "AED", "INR");
    const rate = await getExchangeRate(db, "AED", "INR");

    expect(rate).toBeCloseTo(22.5);
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

  it("falls back to the last-known cached rate when the API fails", async () => {
    await getExchangeRate(db, "AED", "INR");

    const sevenHoursAgo = new Date(Date.now() - 7 * 60 * 60 * 1000);
    db.update(exchangeRateCache)
      .set({ fetchedAt: sevenHoursAgo })
      .where(eq(exchangeRateCache.baseCurrency, "AED"))
      .run();

    global.fetch = jest.fn(async () => ({ ok: false, status: 503 })) as unknown as typeof fetch;

    const rate = await getExchangeRate(db, "AED", "INR");
    expect(rate).toBeCloseTo(22.5); // stale but not thrown/crashed
  });

  it("throws when there is no cache at all and the API fails", async () => {
    global.fetch = jest.fn(async () => ({ ok: false, status: 503 })) as unknown as typeof fetch;
    await expect(getExchangeRate(db, "AED", "INR")).rejects.toThrow();
  });
});

describe("getRatesToINR", () => {
  it("batches every needed currency into a single request", async () => {
    mockFrankfurter({ AED: 1 / 22.5, USD: 1 / 83 });

    const rates = await getRatesToINR(db, ["AED", "USD", "AED"]);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect((fetch as jest.Mock).mock.calls[0][0]).toContain("quotes=AED,USD");
    expect(rates.AED).toBeCloseTo(22.5);
    expect(rates.USD).toBeCloseTo(83);
  });

  it("excludes INR and returns an empty object when nothing else is needed", async () => {
    const rates = await getRatesToINR(db, ["INR"]);
    expect(rates).toEqual({});
    expect(fetch).not.toHaveBeenCalled();
  });
});
