// Erebor V2 master prompt §32's explicit transfer regression test, plus
// debt-payoff-projection coverage (previously untested) — added before any
// V2 UI work per the master prompt's "financial regression protection"
// phase. Exercises the existing balance.ts engine as-is; no new formulas.
import { transactions } from "../db/schema";
import { getAccountBalanceMinor, getDebtPayoffProjection, getNetWorthSeries, getPeriodTotals } from "../services/balance";
import { closeTestDb, createTestDb, insertAccount, type TestDb } from "./testDb";

let db: TestDb;

beforeEach(() => {
  db = createTestDb();
});

afterEach(() => {
  closeTestDb(db);
});

describe("transfer regression: A -> B = 1000", () => {
  it("debits A, credits B, and leaves consolidated income/expense/net worth unaffected", () => {
    const accountA = insertAccount(db, { name: "A" });
    const accountB = insertAccount(db, { name: "B" });

    db.insert(transactions)
      .values([
        // Starting balances so both accounts are nonzero before the transfer.
        { type: "income", amountMinor: 500000, date: new Date("2026-01-01"), accountId: accountA },
        { type: "income", amountMinor: 200000, date: new Date("2026-01-01"), accountId: accountB },
      ])
      .run();

    const netWorthBefore = getAccountBalanceMinor(db, accountA) + getAccountBalanceMinor(db, accountB);

    db.insert(transactions)
      .values({
        type: "transfer",
        amountMinor: 100000,
        date: new Date("2026-01-15"),
        accountId: accountA,
        toAccountId: accountB,
      })
      .run();

    // Per-account impact: -1000 on the source, +1000 on the destination.
    expect(getAccountBalanceMinor(db, accountA)).toBe(400000);
    expect(getAccountBalanceMinor(db, accountB)).toBe(300000);

    // Consolidated (whole-portfolio) income/expense for the period the
    // transfer falls in must both be zero — moving your own money isn't
    // income or spending.
    const totalsA = getPeriodTotals(db, {
      accountId: accountA,
      start: new Date("2026-01-01"),
      end: new Date("2026-02-01"),
    });
    const totalsB = getPeriodTotals(db, {
      accountId: accountB,
      start: new Date("2026-01-01"),
      end: new Date("2026-02-01"),
    });
    expect(totalsA.expenseMinor).toBe(0);
    expect(totalsA.incomeMinor).toBe(500000); // the earlier income row, not the transfer
    expect(totalsB.incomeMinor).toBe(200000); // ditto — the transfer must not inflate this
    expect(totalsB.expenseMinor).toBe(0);

    // Net worth (sum across accounts) is unchanged by an internal transfer.
    const netWorthAfter = getAccountBalanceMinor(db, accountA) + getAccountBalanceMinor(db, accountB);
    expect(netWorthAfter).toBe(netWorthBefore);

    const identity = (amountMinor: number) => amountMinor;
    const series = getNetWorthSeries(
      db,
      [
        { id: accountA, currency: "INR" },
        { id: accountB, currency: "INR" },
      ],
      [new Date("2026-01-10"), new Date("2026-02-01")],
      identity,
    );
    expect(series[0]).toBe(netWorthBefore);
    expect(series[1]).toBe(netWorthAfter);
    expect(series[1]).toBe(series[0]);
  });
});

describe("getDebtPayoffProjection", () => {
  it("returns null when there is no debt", () => {
    const accountId = insertAccount(db, { type: "credit_card", creditLimitMinor: 100000 });
    db.insert(transactions)
      .values({ type: "income", amountMinor: 1000, date: new Date(), accountId })
      .run();

    expect(getDebtPayoffProjection(db, accountId)).toBeNull();
  });

  it("projects a payoff date from the trailing 6-month reduction pace", () => {
    const accountId = insertAccount(db, { type: "credit_card", creditLimitMinor: 500000 });
    const now = new Date();
    const sevenMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 7, now.getDate());
    const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, now.getDate());

    db.insert(transactions)
      .values([
        // Owed ~60000 six months ago...
        { type: "expense", amountMinor: 60000, date: sevenMonthsAgo, accountId },
        // ...paid down to 30000 owed today (a 30000-over-6-months pace).
        { type: "income", amountMinor: 30000, date: twoMonthsAgo, accountId },
      ])
      .run();

    const projection = getDebtPayoffProjection(db, accountId);
    expect(projection).not.toBeNull();
    expect(projection!.owedTodayMinor).toBe(30000);
    expect(projection!.monthlyReductionMinor).toBeCloseTo(5000);
    expect(projection!.projectedDate).not.toBeNull();
  });

  it("has no projected date when the debt isn't shrinking", () => {
    const accountId = insertAccount(db, { type: "credit_card", creditLimitMinor: 500000 });
    db.insert(transactions)
      .values({ type: "expense", amountMinor: 30000, date: new Date(), accountId })
      .run();

    const projection = getDebtPayoffProjection(db, accountId);
    expect(projection).not.toBeNull();
    expect(projection!.monthlyReductionMinor).toBeLessThanOrEqual(0);
    expect(projection!.projectedDate).toBeNull();
  });
});
