import { transactions } from "../db/schema";
import {
  getAccountBalanceMinor,
  getCreditCardOwedMinor,
  getNetWorthSeries,
  getPeriodTotals,
} from "../services/balance";
import { closeTestDb, createTestDb, insertAccount, type TestDb } from "./testDb";

let db: TestDb;

beforeEach(() => {
  db = createTestDb();
});

afterEach(() => {
  closeTestDb(db);
});

describe("getAccountBalanceMinor", () => {
  it("sums income and expense for a single account", () => {
    const accountId = insertAccount(db);
    db.insert(transactions)
      .values([
        { type: "income", amountMinor: 10000, date: new Date(), accountId },
        { type: "expense", amountMinor: 4000, date: new Date(), accountId },
      ])
      .run();

    expect(getAccountBalanceMinor(db, accountId)).toBe(6000);
  });

  it("applies a transfer as -amount on the source and +amount on the destination", () => {
    const accountA = insertAccount(db, { name: "A" });
    const accountB = insertAccount(db, { name: "B" });
    db.insert(transactions)
      .values({
        type: "income",
        amountMinor: 50000,
        date: new Date(),
        accountId: accountA,
      })
      .run();
    db.insert(transactions)
      .values({
        type: "transfer",
        amountMinor: 10000,
        date: new Date(),
        accountId: accountA,
        toAccountId: accountB,
      })
      .run();

    // Spec.md §5.2: transferring ₹100 from A to B shows as -₹100 in A, +₹100 in B.
    expect(getAccountBalanceMinor(db, accountA)).toBe(40000);
    expect(getAccountBalanceMinor(db, accountB)).toBe(10000);
  });

  it("returns 0 for an account with no transactions", () => {
    const accountId = insertAccount(db);
    expect(getAccountBalanceMinor(db, accountId)).toBe(0);
  });

  it("scopes to asOfDate instead of always summing to today", () => {
    const accountId = insertAccount(db);
    db.insert(transactions)
      .values([
        { type: "income", amountMinor: 10000, date: new Date("2026-01-15"), accountId },
        { type: "expense", amountMinor: 3000, date: new Date("2026-02-15"), accountId },
      ])
      .run();

    // As of end of January: only the January income counts.
    expect(getAccountBalanceMinor(db, accountId, new Date("2026-02-01"))).toBe(10000);
    // As of end of February (exclusive upper bound, matches getPeriodTotals'
    // range.end convention): both rows count.
    expect(getAccountBalanceMinor(db, accountId, new Date("2026-03-01"))).toBe(7000);
    // No asOfDate at all: the account's whole history. Note this is NOT the
    // same as "as of now" whenever future-dated rows exist — see the
    // regression test below.
    expect(getAccountBalanceMinor(db, accountId)).toBe(7000);
  });

  // Regression: the Dashboard's net worth called this with no asOfDate,
  // which silently added already-materialized future-dated recurring rows
  // (next month's salary and so on) to the headline figure — reported
  // on-device as ~17 lakh where ~13 lakh was correct. The same
  // "omitted cutoff" mistake had already shipped once in the home screen
  // widget, so it is pinned here rather than left to review.
  it("omitting asOfDate includes future-dated rows, a cutoff excludes them", () => {
    const accountId = insertAccount(db);
    const today = new Date("2026-06-10");
    const nextMonth = new Date("2026-07-01");
    db.insert(transactions)
      .values([
        { type: "income", amountMinor: 1_300_000, date: new Date("2026-06-01"), accountId },
        // Already materialized, but hasn't happened yet.
        { type: "income", amountMinor: 450_000, date: new Date("2026-07-25"), accountId },
      ])
      .run();

    // What the Dashboard must show: this month's position only.
    expect(getAccountBalanceMinor(db, accountId, nextMonth)).toBe(1_300_000);
    // What the bug did: swept in the future-dated row too.
    expect(getAccountBalanceMinor(db, accountId)).toBe(1_750_000);
    // And a cutoff at today likewise excludes it.
    expect(getAccountBalanceMinor(db, accountId, today)).toBe(1_300_000);
  });

  it("an opening balance doesn't leak into periods before the account existed", () => {
    const accountId = insertAccount(db);
    db.insert(transactions)
      .values({
        type: "income",
        amountMinor: 50000,
        date: new Date("2026-03-01"),
        accountId,
        isOpeningBalance: true,
      })
      .run();

    // A month before the account's own opening date — should see nothing.
    expect(getAccountBalanceMinor(db, accountId, new Date("2026-02-01"))).toBe(0);
    // As of (or after) the opening date — the opening balance is in effect.
    expect(getAccountBalanceMinor(db, accountId, new Date("2026-03-02"))).toBe(50000);
  });
});

describe("getPeriodTotals", () => {
  it("only includes transactions within the given date range", () => {
    const accountId = insertAccount(db);
    db.insert(transactions)
      .values([
        {
          type: "income",
          amountMinor: 10000,
          date: new Date("2026-01-15"),
          accountId,
        },
        {
          type: "expense",
          amountMinor: 3000,
          date: new Date("2026-01-20"),
          accountId,
        },
        // Outside the queried period — must not be counted.
        {
          type: "income",
          amountMinor: 99999,
          date: new Date("2026-02-01"),
          accountId,
        },
      ])
      .run();

    const totals = getPeriodTotals(db, {
      accountId,
      start: new Date("2026-01-01"),
      end: new Date("2026-02-01"),
    });

    expect(totals).toEqual({ incomeMinor: 10000, expenseMinor: 3000 });
  });

  it("excludes transfers from income/expense totals", () => {
    const accountA = insertAccount(db, { name: "A" });
    const accountB = insertAccount(db, { name: "B" });
    db.insert(transactions)
      .values({
        type: "transfer",
        amountMinor: 5000,
        date: new Date("2026-03-01"),
        accountId: accountA,
        toAccountId: accountB,
      })
      .run();

    const totals = getPeriodTotals(db, {
      accountId: accountA,
      start: new Date("2026-03-01"),
      end: new Date("2026-04-01"),
    });

    expect(totals).toEqual({ incomeMinor: 0, expenseMinor: 0 });
  });
});

describe("getCreditCardOwedMinor", () => {
  it("is the positive inverse of the (negative) balance", () => {
    const accountId = insertAccount(db, {
      type: "credit_card",
      creditLimitMinor: 100000,
    });
    db.insert(transactions)
      .values([
        { type: "expense", amountMinor: 8000, date: new Date(), accountId },
        { type: "income", amountMinor: 2000, date: new Date(), accountId }, // bill payment
      ])
      .run();

    expect(getAccountBalanceMinor(db, accountId)).toBe(-6000);
    expect(getCreditCardOwedMinor(db, accountId)).toBe(6000);
  });
});

describe("getNetWorthSeries", () => {
  const identity = (amountMinor: number) => amountMinor;

  it("sums balances across accounts, one figure per cutoff", () => {
    const accountA = insertAccount(db, { name: "A" });
    const accountB = insertAccount(db, { name: "B" });
    db.insert(transactions)
      .values([
        { type: "income", amountMinor: 10000, date: new Date("2026-01-15"), accountId: accountA },
        { type: "income", amountMinor: 5000, date: new Date("2026-03-15"), accountId: accountB },
      ])
      .run();

    const series = getNetWorthSeries(
      db,
      [
        { id: accountA, currency: "INR" },
        { id: accountB, currency: "INR" },
      ],
      [new Date("2026-02-01"), new Date("2026-04-01")],
      identity,
    );

    // As of Feb 1: only A's January income counts. As of Apr 1: both do.
    expect(series).toEqual([10000, 15000]);
  });

  it("converts each account's currency to the base currency before summing", () => {
    const accountInr = insertAccount(db, { currency: "INR" });
    const accountAed = insertAccount(db, { currency: "AED" });
    db.insert(transactions)
      .values([
        { type: "income", amountMinor: 10000, date: new Date("2026-01-01"), accountId: accountInr },
        { type: "income", amountMinor: 1000, date: new Date("2026-01-01"), accountId: accountAed },
      ])
      .run();

    const toBaseMinor = (amountMinor: number, currency: string) =>
      currency === "AED" ? amountMinor * 20 : amountMinor;

    const series = getNetWorthSeries(
      db,
      [
        { id: accountInr, currency: "INR" },
        { id: accountAed, currency: "AED" },
      ],
      [new Date("2026-02-01")],
      toBaseMinor,
    );

    expect(series).toEqual([10000 + 1000 * 20]);
  });
});
