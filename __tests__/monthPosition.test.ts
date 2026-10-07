// V4 (spec.md §5.24) adds two figures to the Dashboard/Analytics: how net
// worth moved this month, and a like-for-like "spending vs last month".
// The rest of the month position is the existing balance.ts engine, moved
// verbatim and covered by balance.test.ts.
import { transactions } from "../db/schema";
import { getAccountBalanceMinor, getPeriodTotals } from "../services/balance";
import { likeForLikeRanges, monthRange } from "../services/period";
import { closeTestDb, createTestDb, insertAccount, type TestDb } from "./testDb";

const d = (y: number, m: number, day: number) => new Date(y, m, day).getTime();

describe("likeForLikeRanges", () => {
  it("day 1 compares the 1st with the 1st of last month", () => {
    const r = likeForLikeRanges({ year: 2026, month: 9 }, new Date(2026, 9, 1, 15));
    expect(r.isPartial).toBe(true);
    expect(r.days).toBe(1);
    expect(r.current.start.getTime()).toBe(d(2026, 9, 1));
    expect(r.current.end.getTime()).toBe(d(2026, 9, 2));
    expect(r.previous.start.getTime()).toBe(d(2026, 8, 1));
    expect(r.previous.end.getTime()).toBe(d(2026, 8, 2));
  });

  it("31 March compares with all of February, not into March", () => {
    const r = likeForLikeRanges({ year: 2026, month: 2 }, new Date(2026, 2, 31));
    expect(r.current.end.getTime()).toBe(d(2026, 3, 1));
    expect(r.previous.end.getTime()).toBe(d(2026, 2, 1));
  });

  it("caps at 29 days in a leap February", () => {
    const r = likeForLikeRanges({ year: 2028, month: 2 }, new Date(2028, 2, 30));
    expect(r.previous.end.getTime()).toBe(d(2028, 2, 1));
    expect(r.previous.start.getTime()).toBe(d(2028, 1, 1));
  });

  it("January compares with December of the previous year", () => {
    const r = likeForLikeRanges({ year: 2027, month: 0 }, new Date(2027, 0, 15));
    expect(r.previous.start.getTime()).toBe(d(2026, 11, 1));
    expect(r.previous.end.getTime()).toBe(d(2026, 11, 16));
  });

  it("a month that isn't the current one compares whole months", () => {
    const r = likeForLikeRanges({ year: 2026, month: 1 }, new Date(2026, 9, 5));
    expect(r.isPartial).toBe(false);
    expect(r.days).toBe(28);
    expect(r.current).toEqual(monthRange({ year: 2026, month: 1 }));
    expect(r.previous).toEqual(monthRange({ year: 2026, month: 0 }));
  });
});

describe("net worth change over a month", () => {
  let db: TestDb;
  beforeEach(() => {
    db = createTestDb();
  });
  afterEach(() => closeTestDb(db));

  it("equals income − spending, with transfers between own accounts netting to zero", () => {
    const a = insertAccount(db, { name: "A" });
    const b = insertAccount(db, { name: "B", type: "wallet" });
    db.insert(transactions)
      .values([
        { type: "income", amountMinor: 500000, date: new Date(2026, 8, 20), accountId: a },
        { type: "income", amountMinor: 120000, date: new Date(2026, 9, 3), accountId: a },
        { type: "expense", amountMinor: 45000, date: new Date(2026, 9, 10), accountId: b },
        { type: "transfer", amountMinor: 80000, date: new Date(2026, 9, 5), accountId: a, toAccountId: b },
        // Next month — must not leak into October.
        { type: "expense", amountMinor: 99999, date: new Date(2026, 10, 2), accountId: a },
      ])
      .run();

    const range = monthRange({ year: 2026, month: 9 });
    const ids = [a, b];
    const netWorthEnd = ids.reduce((s, id) => s + getAccountBalanceMinor(db, id, range.end), 0);
    const carryForward = ids.reduce((s, id) => s + getAccountBalanceMinor(db, id, range.start), 0);
    let income = 0;
    let expense = 0;
    for (const id of ids) {
      const t = getPeriodTotals(db, { accountId: id, ...range });
      income += t.incomeMinor;
      expense += t.expenseMinor;
    }

    expect(carryForward).toBe(500000);
    expect(netWorthEnd - carryForward).toBe(income - expense);
    expect(netWorthEnd - carryForward).toBe(75000);
  });
});
