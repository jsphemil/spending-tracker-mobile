import { transactions } from "../db/schema";
import {
  getAccountBalanceMinor,
  getCreditCardOwedMinor,
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
    // No asOfDate at all: same as "as of now," i.e. everything.
    expect(getAccountBalanceMinor(db, accountId)).toBe(7000);
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
