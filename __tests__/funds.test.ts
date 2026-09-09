import { eq } from "drizzle-orm";

import { fundAllocations, funds, transactions } from "../db/schema";
import { getAccountBalanceMinor, getNetWorthSeries } from "../services/balance";
import {
  computeFundProgress,
  getFundBalances,
  getFundHistory,
  getFundLinkedCurrencies,
  sumEarmarkedMinor,
  type FundBalance,
} from "../services/funds";
import { closeTestDb, createTestDb, insertAccount, type TestDb } from "./testDb";

let db: TestDb;

beforeEach(() => {
  db = createTestDb();
});

afterEach(() => {
  closeTestDb(db);
});

// Every amount below is in minor units (paise), so 10_000 reads as ₹100.
const INR_ONLY = (amountMinor: number, currency: string) => {
  if (currency === "INR") return amountMinor;
  throw new Error(`unexpected conversion of ${currency} in a single-currency test`);
};

function makeFund(overrides: Partial<{ name: string; targetAmountMinor: number }> = {}): number {
  const [row] = db
    .insert(funds)
    .values({
      name: overrides.name ?? "Laptop",
      targetAmountMinor: overrides.targetAmountMinor ?? 100_000,
      icon: "piggy-bank",
      color: "#000000",
    })
    .returning({ id: funds.id })
    .all();
  return row.id;
}

function allocate(fundId: number, amountMinor: number, date = new Date()): void {
  db.insert(fundAllocations).values({ fundId, amountMinor, date }).run();
}

function balanceOf(fundId: number, asOfDate?: Date): FundBalance {
  return getFundBalances(db, INR_ONLY, asOfDate).get(fundId)!;
}

describe("getFundBalances — allocation only", () => {
  it("a new fund starts at zero and reports 0% progress", () => {
    const fundId = makeFund({ targetAmountMinor: 100_000 });
    const balance = balanceOf(fundId);

    expect(balance.fundedMinor).toBe(0);
    expect(balance.overspentMinor).toBe(0);
    expect(computeFundProgress(100_000, balance).percent).toBe(0);
  });

  it("earmarking money leaves account balances and net worth untouched", () => {
    const accountId = insertAccount(db);
    db.insert(transactions)
      .values({ type: "income", amountMinor: 100_000, date: new Date(), accountId })
      .run();
    const fundId = makeFund();

    const balanceBefore = getAccountBalanceMinor(db, accountId);
    allocate(fundId, 10_000);

    // The whole point of the feature: a fund holds no money of its own.
    expect(getAccountBalanceMinor(db, accountId)).toBe(balanceBefore);
    expect(balanceOf(fundId).fundedMinor).toBe(10_000);
  });

  it("releasing money reduces the fund without touching anything else", () => {
    const fundId = makeFund();
    allocate(fundId, 10_000);
    allocate(fundId, -2_000);

    expect(balanceOf(fundId).fundedMinor).toBe(8_000);
  });

  it("funds are independent, and earmarked is their sum", () => {
    const laptop = makeFund({ name: "Laptop", targetAmountMinor: 100_000 });
    const vacation = makeFund({ name: "Vacation", targetAmountMinor: 75_000 });
    allocate(laptop, 65_000);
    allocate(vacation, 40_000);

    const balances = getFundBalances(db, INR_ONLY);
    expect(balances.get(laptop)!.fundedMinor).toBe(65_000);
    expect(balances.get(vacation)!.fundedMinor).toBe(40_000);
    expect(sumEarmarkedMinor(balances)).toBe(105_000);
  });
});

describe("getFundBalances — spending against a fund", () => {
  it("consumes the fund and leaves unallocated wealth unchanged", () => {
    const accountId = insertAccount(db);
    db.insert(transactions)
      .values({ type: "income", amountMinor: 100_000, date: new Date(), accountId })
      .run();
    const fundId = makeFund();
    allocate(fundId, 50_000);

    const accountList = [{ id: accountId, currency: "INR" }];
    const cutoff = new Date(Date.now() + 60_000);
    const [netWorthBefore] = getNetWorthSeries(db, accountList, [cutoff], INR_ONLY);
    const unallocatedBefore = netWorthBefore - sumEarmarkedMinor(getFundBalances(db, INR_ONLY));

    db.insert(transactions)
      .values({ type: "expense", amountMinor: 45_000, date: new Date(), accountId, fundId })
      .run();

    const [netWorthAfter] = getNetWorthSeries(db, accountList, [cutoff], INR_ONLY);
    const balances = getFundBalances(db, INR_ONLY);
    const unallocatedAfter = netWorthAfter - sumEarmarkedMinor(balances);

    expect(netWorthAfter).toBe(netWorthBefore - 45_000); // the expense is real
    expect(balances.get(fundId)!.fundedMinor).toBe(5_000);
    // Net worth and earmarked both fell by 45_000, so spending earmarked
    // money leaves unallocated wealth exactly where it was.
    expect(unallocatedAfter).toBe(unallocatedBefore);
  });

  it("editing a fund-linked expense returns the difference to the fund", () => {
    const accountId = insertAccount(db);
    const fundId = makeFund();
    allocate(fundId, 50_000);
    const [expense] = db
      .insert(transactions)
      .values({ type: "expense", amountMinor: 40_000, date: new Date(), accountId, fundId })
      .returning({ id: transactions.id })
      .all();

    expect(balanceOf(fundId).fundedMinor).toBe(10_000);

    db.update(transactions)
      .set({ amountMinor: 35_000 })
      .where(eq(transactions.id, expense.id))
      .run();

    // No reconciliation code ran — the balance is derived, so the edit is
    // reflected automatically. This is the whole reason for not storing it.
    expect(balanceOf(fundId).fundedMinor).toBe(15_000);
  });

  it("deleting a fund-linked expense returns the whole consumed amount", () => {
    const accountId = insertAccount(db);
    const fundId = makeFund();
    allocate(fundId, 50_000);
    const [expense] = db
      .insert(transactions)
      .values({ type: "expense", amountMinor: 40_000, date: new Date(), accountId, fundId })
      .returning({ id: transactions.id })
      .all();

    db.delete(transactions).where(eq(transactions.id, expense.id)).run();

    expect(balanceOf(fundId).fundedMinor).toBe(50_000);
  });

  it("overspending empties the fund without going negative, and reports the shortfall", () => {
    const accountId = insertAccount(db);
    const fundId = makeFund();
    allocate(fundId, 40_000);
    db.insert(transactions)
      .values({ type: "expense", amountMinor: 50_000, date: new Date(), accountId, fundId })
      .run();

    const balance = balanceOf(fundId);
    expect(balance.fundedMinor).toBe(0); // never negative — a fund is not a limit
    expect(balance.overspentMinor).toBe(10_000);
    expect(balance.spentMinor).toBe(50_000); // the expense is recorded in full
    expect(getAccountBalanceMinor(db, accountId)).toBe(-50_000);
  });

  it("leaves the remainder in the fund after a partial spend", () => {
    const accountId = insertAccount(db);
    const fundId = makeFund();
    allocate(fundId, 100_000);
    db.insert(transactions)
      .values({ type: "expense", amountMinor: 75_000, date: new Date(), accountId, fundId })
      .run();

    // Nothing auto-releases — the user decides what to do with the rest.
    expect(balanceOf(fundId).fundedMinor).toBe(25_000);
  });

  it("ignores a stray fund link on a non-expense row", () => {
    const accountId = insertAccount(db);
    const toAccountId = insertAccount(db, { name: "B" });
    const fundId = makeFund();
    allocate(fundId, 10_000);
    db.insert(transactions)
      .values([
        { type: "income", amountMinor: 5_000, date: new Date(), accountId, fundId },
        {
          type: "transfer",
          amountMinor: 5_000,
          date: new Date(),
          accountId,
          toAccountId,
          fundId,
        },
      ])
      .run();

    expect(balanceOf(fundId).fundedMinor).toBe(10_000);
  });

  it("handles a credit-card expense with no card-specific branch", () => {
    const cardId = insertAccount(db, { type: "credit_card", creditLimitMinor: 100_000 });
    const fundId = makeFund();
    allocate(fundId, 50_000);
    db.insert(transactions)
      .values({ type: "expense", amountMinor: 20_000, date: new Date(), accountId: cardId, fundId })
      .run();

    expect(balanceOf(fundId).fundedMinor).toBe(30_000);
    expect(getAccountBalanceMinor(db, cardId)).toBe(-20_000);
  });
});

describe("getFundBalances — transfers and income", () => {
  it("a transfer between accounts changes nothing about funds", () => {
    const accountA = insertAccount(db, { name: "A" });
    const accountB = insertAccount(db, { name: "B" });
    db.insert(transactions)
      .values({ type: "income", amountMinor: 100_000, date: new Date(), accountId: accountA })
      .run();
    const fundId = makeFund();
    allocate(fundId, 30_000);

    const accountList = [
      { id: accountA, currency: "INR" },
      { id: accountB, currency: "INR" },
    ];
    const cutoff = new Date(Date.now() + 60_000);
    const [netWorthBefore] = getNetWorthSeries(db, accountList, [cutoff], INR_ONLY);

    db.insert(transactions)
      .values({
        type: "transfer",
        amountMinor: 20_000,
        date: new Date(),
        accountId: accountA,
        toAccountId: accountB,
      })
      .run();

    const [netWorthAfter] = getNetWorthSeries(db, accountList, [cutoff], INR_ONLY);
    expect(netWorthAfter).toBe(netWorthBefore);
    expect(balanceOf(fundId).fundedMinor).toBe(30_000);
  });

  it("income raises unallocated wealth by exactly the income", () => {
    const accountId = insertAccount(db);
    db.insert(transactions)
      .values({ type: "income", amountMinor: 100_000, date: new Date(), accountId })
      .run();
    const fundId = makeFund();
    allocate(fundId, 20_000);

    const accountList = [{ id: accountId, currency: "INR" }];
    const cutoff = new Date(Date.now() + 60_000);
    const earmarked = sumEarmarkedMinor(getFundBalances(db, INR_ONLY));
    const [before] = getNetWorthSeries(db, accountList, [cutoff], INR_ONLY);

    db.insert(transactions)
      .values({ type: "income", amountMinor: 50_000, date: new Date(), accountId })
      .run();

    const [after] = getNetWorthSeries(db, accountList, [cutoff], INR_ONLY);
    const earmarkedAfter = sumEarmarkedMinor(getFundBalances(db, INR_ONLY));

    expect(earmarkedAfter).toBe(earmarked); // nothing auto-enters a fund
    expect(after - earmarkedAfter).toBe(before - earmarked + 50_000);
  });
});

describe("getFundBalances — asOfDate cutoff", () => {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const nextMonth = new Date(Date.now() + 31 * 24 * 60 * 60 * 1000);

  it("excludes allocations dated on or after the cutoff", () => {
    const fundId = makeFund();
    allocate(fundId, 10_000, yesterday);
    allocate(fundId, 5_000, nextMonth);

    expect(balanceOf(fundId, new Date()).fundedMinor).toBe(10_000);
    expect(balanceOf(fundId).fundedMinor).toBe(15_000);
  });

  // Regression guard mirroring balance.test.ts's cutoff test: the same
  // "forgot the asOfDate" omission has shipped twice for account balances,
  // once on the Dashboard and once in the widget. Pinning the difference
  // here means a future call site that drops the argument fails loudly
  // rather than quietly counting a future-dated purchase early.
  it("omitting asOfDate counts a future-dated linked expense, a cutoff excludes it", () => {
    const accountId = insertAccount(db);
    const fundId = makeFund();
    allocate(fundId, 50_000, yesterday);
    db.insert(transactions)
      .values({ type: "expense", amountMinor: 30_000, date: nextMonth, accountId, fundId })
      .run();

    expect(balanceOf(fundId, new Date()).fundedMinor).toBe(50_000);
    expect(balanceOf(fundId).fundedMinor).toBe(20_000);
  });
});

describe("getFundBalances — multiple currencies", () => {
  it("converts a foreign-currency linked expense before consuming the fund", () => {
    const usdAccount = insertAccount(db, { currency: "USD" });
    const fundId = makeFund();
    allocate(fundId, 50_000); // ₹500
    db.insert(transactions)
      .values({ type: "expense", amountMinor: 200, date: new Date(), accountId: usdAccount, fundId })
      .run(); // $2.00

    // 1 USD = ₹100, so $2.00 spends ₹200 = 20_000 paise.
    const toBase = (amountMinor: number, currency: string) =>
      currency === "USD" ? amountMinor * 100 : amountMinor;

    expect(getFundBalances(db, toBase).get(fundId)!.fundedMinor).toBe(30_000);
  });

  it("a missing exchange rate understates spending, the conservative direction", () => {
    const usdAccount = insertAccount(db, { currency: "USD" });
    const fundId = makeFund();
    allocate(fundId, 50_000);
    db.insert(transactions)
      .values({ type: "expense", amountMinor: 200, date: new Date(), accountId: usdAccount, fundId })
      .run();

    // useBaseConverter returns 0 for a currency with no rate yet.
    const missingRate = (amountMinor: number, currency: string) =>
      currency === "USD" ? 0 : amountMinor;

    // Earmarked reads high, so Unallocated reads low — safer than telling
    // the user they have more free money than they do. The screen discloses
    // it via the currency list below.
    expect(getFundBalances(db, missingRate).get(fundId)!.fundedMinor).toBe(50_000);
    expect(getFundLinkedCurrencies(db)).toEqual(["USD"]);
  });
});

describe("computeFundProgress", () => {
  it("reports partial progress", () => {
    const fundId = makeFund({ targetAmountMinor: 100_000 });
    allocate(fundId, 65_000);
    const progress = computeFundProgress(100_000, balanceOf(fundId));

    expect(progress.percent).toBe(65);
    expect(progress.remainingMinor).toBe(35_000);
    expect(progress.isFullyFunded).toBe(false);
  });

  it("marks a fund ready once funded meets target, without closing it", () => {
    const fundId = makeFund({ targetAmountMinor: 100_000 });
    allocate(fundId, 100_000);
    const progress = computeFundProgress(100_000, balanceOf(fundId));

    expect(progress.isFullyFunded).toBe(true);
    expect(progress.isOverfunded).toBe(false);
    expect(progress.remainingMinor).toBe(0);
    // Still active — the user may not buy the thing immediately.
    expect(db.select().from(funds).where(eq(funds.id, fundId)).get()!.status).toBe("active");
  });

  it("allows overfunding and reports the excess", () => {
    const fundId = makeFund({ targetAmountMinor: 100_000 });
    allocate(fundId, 105_000);
    const progress = computeFundProgress(100_000, balanceOf(fundId));

    expect(progress.isOverfunded).toBe(true);
    expect(progress.overMinor).toBe(5_000);
    expect(progress.percent).toBe(100); // bar caps, the number doesn't
    expect(balanceOf(fundId).fundedMinor).toBe(105_000);
  });

  it("leaves funded untouched when the target moves either way", () => {
    const fundId = makeFund({ targetAmountMinor: 100_000 });
    allocate(fundId, 80_000);

    // Raising the target only changes what's remaining.
    expect(computeFundProgress(120_000, balanceOf(fundId)).remainingMinor).toBe(40_000);
    // Lowering it below funded releases nothing — it just reads as overfunded.
    const lowered = computeFundProgress(70_000, balanceOf(fundId));
    expect(lowered.isOverfunded).toBe(true);
    expect(lowered.overMinor).toBe(10_000);
    expect(balanceOf(fundId).fundedMinor).toBe(80_000);
  });

  it("does not divide by a zero target", () => {
    const progress = computeFundProgress(0, { ...balanceOf(makeFund()), fundedMinor: 5_000 });
    expect(Number.isFinite(progress.percent)).toBe(true);
    expect(progress.percent).toBe(0);
  });
});

// closeFund itself lives in db/actions (module-singleton db, not testable),
// so these pin the *model* it relies on: a balancing release rather than a
// status filter. That's what lets services/funds.ts ignore status entirely.
describe("closing a fund", () => {
  it("returns its balance to unallocated while leaving net worth alone", () => {
    const accountId = insertAccount(db);
    db.insert(transactions)
      .values({ type: "income", amountMinor: 100_000, date: new Date(), accountId })
      .run();
    const fundId = makeFund();
    allocate(fundId, 35_000, new Date(2026, 0, 1));

    const accountList = [{ id: accountId, currency: "INR" }];
    const cutoff = new Date(Date.now() + 60_000);
    const [netWorthBefore] = getNetWorthSeries(db, accountList, [cutoff], INR_ONLY);

    // What closeFund writes.
    allocate(fundId, -35_000, new Date(2026, 5, 1));
    db.update(funds)
      .set({ status: "closed", closedAt: new Date(2026, 5, 1) })
      .where(eq(funds.id, fundId))
      .run();

    const [netWorthAfter] = getNetWorthSeries(db, accountList, [cutoff], INR_ONLY);
    expect(netWorthAfter).toBe(netWorthBefore);
    expect(sumEarmarkedMinor(getFundBalances(db, INR_ONLY))).toBe(0);
  });

  it("still reports its old balance for a cutoff before the close", () => {
    const fundId = makeFund();
    allocate(fundId, 35_000, new Date(2026, 0, 1));
    allocate(fundId, -35_000, new Date(2026, 5, 1));

    // Paging the Dashboard back to March must not retroactively unwind a
    // fund that was genuinely funded then — which is exactly what a
    // status-based filter would have got wrong.
    expect(balanceOf(fundId, new Date(2026, 2, 1)).fundedMinor).toBe(35_000);
    expect(balanceOf(fundId, new Date(2026, 8, 1)).fundedMinor).toBe(0);
  });

  it("absorbs a linked expense dated after the close without going negative", () => {
    const accountId = insertAccount(db);
    const fundId = makeFund();
    allocate(fundId, 35_000, new Date(2026, 0, 1));
    allocate(fundId, -35_000, new Date(2026, 5, 1));
    db.insert(transactions)
      .values({ type: "expense", amountMinor: 5_000, date: new Date(2026, 6, 1), accountId, fundId })
      .run();

    expect(balanceOf(fundId).fundedMinor).toBe(0);
  });
});

describe("getFundHistory", () => {
  it("merges allocations and linked spending, newest first", () => {
    const accountId = insertAccount(db);
    const fundId = makeFund();
    const day = (n: number) => new Date(2026, 0, n);

    allocate(fundId, 10_000, day(1));
    allocate(fundId, -2_000, day(2));
    db.insert(transactions)
      .values({
        type: "expense",
        amountMinor: 5_000,
        date: day(3),
        accountId,
        fundId,
        description: "Laptop",
      })
      .run();

    const history = getFundHistory(db, fundId);
    expect(history.map((entry) => entry.kind)).toEqual(["spend", "allocation", "allocation"]);
    expect(history[0]).toMatchObject({ kind: "spend", amountMinor: 5_000, currency: "INR" });
    expect(history[1]).toMatchObject({ kind: "allocation", amountMinor: -2_000 });
    expect(history[2]).toMatchObject({ kind: "allocation", amountMinor: 10_000 });
  });
});
