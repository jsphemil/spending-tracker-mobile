import { categories, transactions } from "../db/schema";
import { categoryUsageQuery, frequentAmountsQuery, lastUsedAccountQuery } from "../services/transactionDefaults";
import { closeTestDb, createTestDb, insertAccount, type TestDb } from "./testDb";

let db: TestDb;

beforeEach(() => {
  db = createTestDb();
});

afterEach(() => {
  closeTestDb(db);
});

function insertCategory(overrides: Partial<{ name: string; kind: "income" | "expense"; sortOrder: number }> = {}) {
  const [row] = db
    .insert(categories)
    .values({
      name: overrides.name ?? "Category",
      kind: overrides.kind ?? "expense",
      icon: "cart",
      color: "#000000",
      sortOrder: overrides.sortOrder ?? 0,
    })
    .returning({ id: categories.id })
    .all();
  return row.id;
}

const cutoff = new Date("2026-01-01");

describe("categoryUsageQuery", () => {
  it("orders categories by usage count, most-used first", () => {
    const accountId = insertAccount(db);
    const groceries = insertCategory({ name: "Groceries" });
    const fuel = insertCategory({ name: "Fuel" });
    db.insert(transactions)
      .values([
        { type: "expense", amountMinor: 100, date: new Date("2026-02-01"), accountId, categoryId: groceries },
        { type: "expense", amountMinor: 100, date: new Date("2026-02-02"), accountId, categoryId: groceries },
        { type: "expense", amountMinor: 100, date: new Date("2026-02-03"), accountId, categoryId: fuel },
      ])
      .run();

    const rows = categoryUsageQuery(db, "expense", cutoff).all();
    expect(rows.map((r) => r.name)).toEqual(["Groceries", "Fuel"]);
    expect(rows[0].useCount).toBe(2);
    expect(rows[1].useCount).toBe(1);
  });

  it("falls back to sortOrder/id for ties and never-used categories", () => {
    insertCategory({ name: "B", sortOrder: 1 });
    insertCategory({ name: "A", sortOrder: 0 });

    const rows = categoryUsageQuery(db, "expense", cutoff).all();
    expect(rows.map((r) => r.name)).toEqual(["A", "B"]);
  });

  it("excludes opening-balance rows and rows before the cutoff from the count", () => {
    const accountId = insertAccount(db);
    const groceries = insertCategory({ name: "Groceries" });
    db.insert(transactions)
      .values([
        { type: "expense", amountMinor: 100, date: new Date("2025-01-01"), accountId, categoryId: groceries }, // before cutoff
        {
          type: "expense",
          amountMinor: 100,
          date: new Date("2026-02-01"),
          accountId,
          categoryId: groceries,
          isOpeningBalance: true,
        },
      ])
      .run();

    const rows = categoryUsageQuery(db, "expense", cutoff).all();
    expect(rows.find((r) => r.name === "Groceries")?.useCount).toBe(0);
  });

  it("never ranks a category named Adjusting, however often it's used", () => {
    const accountId = insertAccount(db);
    const adjusting = insertCategory({ name: "Adjusting" });
    db.insert(transactions)
      .values([
        { type: "expense", amountMinor: 100, date: new Date("2026-02-01"), accountId, categoryId: adjusting },
        { type: "expense", amountMinor: 100, date: new Date("2026-02-02"), accountId, categoryId: adjusting },
        { type: "expense", amountMinor: 100, date: new Date("2026-02-03"), accountId, categoryId: adjusting },
      ])
      .run();

    const rows = categoryUsageQuery(db, "expense", cutoff).all();
    expect(rows.find((r) => r.name === "Adjusting")).toBeUndefined();
  });

  it("scopes to the given kind", () => {
    insertCategory({ name: "Salary", kind: "income" });
    insertCategory({ name: "Groceries", kind: "expense" });

    const rows = categoryUsageQuery(db, "income", cutoff).all();
    expect(rows.map((r) => r.name)).toEqual(["Salary"]);
  });
});

describe("lastUsedAccountQuery", () => {
  it("picks the account from the most recent transaction in that category", () => {
    const older = insertAccount(db, { name: "Older" });
    const newer = insertAccount(db, { name: "Newer" });
    const groceries = insertCategory({ name: "Groceries" });
    db.insert(transactions)
      .values([
        { type: "expense", amountMinor: 100, date: new Date("2026-01-10"), accountId: older, categoryId: groceries },
        { type: "expense", amountMinor: 100, date: new Date("2026-01-20"), accountId: newer, categoryId: groceries },
      ])
      .run();

    const rows = lastUsedAccountQuery(db, groceries).all();
    expect(rows[0]?.accountId).toBe(newer);
  });

  it("returns nothing for a category with no history", () => {
    const groceries = insertCategory({ name: "Groceries" });
    expect(lastUsedAccountQuery(db, groceries).all()).toEqual([]);
  });
});

describe("frequentAmountsQuery", () => {
  it("returns the top amounts by frequency, most common first", () => {
    const accountId = insertAccount(db);
    const groceries = insertCategory({ name: "Groceries" });
    db.insert(transactions)
      .values([
        { type: "expense", amountMinor: 500, date: new Date("2026-02-01"), accountId, categoryId: groceries },
        { type: "expense", amountMinor: 500, date: new Date("2026-02-02"), accountId, categoryId: groceries },
        { type: "expense", amountMinor: 1000, date: new Date("2026-02-03"), accountId, categoryId: groceries },
      ])
      .run();

    const rows = frequentAmountsQuery(db, groceries, cutoff).all();
    expect(rows[0]).toEqual({ amountMinor: 500, count: 2 });
    expect(rows[1]).toEqual({ amountMinor: 1000, count: 1 });
  });

  it("returns nothing for a category with no history, letting the caller fall back", () => {
    const groceries = insertCategory({ name: "Groceries" });
    expect(frequentAmountsQuery(db, groceries, cutoff).all()).toEqual([]);
  });
});
