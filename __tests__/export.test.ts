import { categories, tags, transactionTags, transactions } from "../db/schema";
import { buildTransactionsCsv } from "../services/export";
import { closeTestDb, createTestDb, insertAccount, type TestDb } from "./testDb";

let db: TestDb;

beforeEach(() => {
  db = createTestDb();
});

afterEach(() => {
  closeTestDb(db);
});

describe("buildTransactionsCsv", () => {
  it("includes the header row and every column for a simple expense", () => {
    const accountId = insertAccount(db, { name: "Cash" });
    const [category] = db
      .insert(categories)
      .values({ name: "Groceries", kind: "expense", icon: "🛒", color: "#000" })
      .returning({ id: categories.id })
      .all();

    db.insert(transactions)
      .values({
        type: "expense",
        amountMinor: 45000,
        date: new Date(2026, 7, 15),
        accountId,
        categoryId: category.id,
        description: "Weekly shop",
      })
      .run();

    const csv = buildTransactionsCsv(db, { accountIds: [], from: null, to: null });
    const lines = csv.replace(/^﻿/, "").split("\r\n");

    expect(lines[0]).toBe("Date,Type,Account,Category,Description,Amount,Currency,Tags,Recurring");
    expect(lines[1]).toBe("2026-08-15,expense,Cash,Groceries,Weekly shop,450,INR,,No");
  });

  it("formats a transfer as \"from → to\" with no category and the source account's currency", () => {
    const accountA = insertAccount(db, { name: "Checking", currency: "USD" });
    const accountB = insertAccount(db, { name: "Savings", currency: "USD" });

    db.insert(transactions)
      .values({
        type: "transfer",
        amountMinor: 10000,
        date: new Date(2026, 0, 1),
        accountId: accountA,
        toAccountId: accountB,
      })
      .run();

    const csv = buildTransactionsCsv(db, { accountIds: [], from: null, to: null });
    const [, row] = csv.replace(/^﻿/, "").split("\r\n");

    expect(row).toBe("2026-01-01,transfer,Checking → Savings,,,100,USD,,No");
  });

  it("labels an opening-balance row and joins multiple tags with a semicolon", () => {
    const accountId = insertAccount(db, { name: "Wallet" });
    const [tag1] = db.insert(tags).values({ name: "Trip" }).returning({ id: tags.id }).all();
    const [tag2] = db.insert(tags).values({ name: "Work" }).returning({ id: tags.id }).all();

    const [tx] = db
      .insert(transactions)
      .values({
        type: "income",
        amountMinor: 500000,
        date: new Date(2026, 0, 1),
        accountId,
        isOpeningBalance: true,
      })
      .returning({ id: transactions.id })
      .all();
    db.insert(transactionTags)
      .values([
        { transactionId: tx.id, tagId: tag1.id },
        { transactionId: tx.id, tagId: tag2.id },
      ])
      .run();

    const csv = buildTransactionsCsv(db, { accountIds: [], from: null, to: null });
    const [, row] = csv.replace(/^﻿/, "").split("\r\n");

    expect(row).toBe("2026-01-01,income,Wallet,Opening Balance,,5000,INR,Trip; Work,No");
  });

  it("filters by account, matching either leg of a transfer", () => {
    const accountA = insertAccount(db, { name: "A" });
    const accountB = insertAccount(db, { name: "B" });
    const accountC = insertAccount(db, { name: "C" });

    db.insert(transactions)
      .values([
        { type: "expense", amountMinor: 1000, date: new Date(2026, 0, 1), accountId: accountA },
        { type: "transfer", amountMinor: 2000, date: new Date(2026, 0, 2), accountId: accountC, toAccountId: accountB },
        { type: "expense", amountMinor: 3000, date: new Date(2026, 0, 3), accountId: accountC },
      ])
      .run();

    const csv = buildTransactionsCsv(db, { accountIds: [accountB], from: null, to: null });
    const lines = csv.replace(/^﻿/, "").split("\r\n");

    // Only the transfer touches account B (as the "to" leg) — the two
    // account-A/C-only rows must be excluded.
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain("transfer");
  });

  it("treats the `to` date as inclusive", () => {
    const accountId = insertAccount(db);
    db.insert(transactions)
      .values([
        { type: "expense", amountMinor: 1000, date: new Date(2026, 0, 10), accountId },
        { type: "expense", amountMinor: 2000, date: new Date(2026, 0, 11), accountId },
      ])
      .run();

    const csv = buildTransactionsCsv(db, {
      accountIds: [],
      from: null,
      to: new Date(2026, 0, 10),
    });
    const lines = csv.replace(/^﻿/, "").split("\r\n");

    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain("2026-01-10");
  });
});
