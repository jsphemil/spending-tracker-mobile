import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

import * as schema from "../db/schema";
import { accounts, type AccountType } from "../db/schema";

// better-sqlite3 is a Node-native SQLite driver used only in tests as a
// stand-in for expo-sqlite — same SQL dialect and drizzle query-builder
// surface, so services/*.ts (which only take a typed `Db` parameter) run
// against it exactly as they would against the real on-device database.
//
// Applies every migration listed in drizzle/meta/_journal.json, in order —
// not just 0000 — so the test schema always matches what actually ships.
// Missing 0001+ silently left the test DB out of sync with production for
// a while (themePreference, monthlyBudgetMinor never existed in-memory);
// reading the journal instead of hardcoding a filename prevents that
// drifting again as new migrations are added.
export function createTestDb() {
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");

  const journal = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../drizzle/meta/_journal.json"), "utf-8"),
  ) as { entries: { tag: string; when: number }[] };

  // The production migrator only runs entries whose `when` is newer than the
  // newest one already applied, so a hand-stamped entry that is *older* than
  // its predecessor silently never runs on upgraded installs (this bit
  // 0013/0014 in September 2026). Fail loudly here instead.
  for (let i = 1; i < journal.entries.length; i++) {
    const prev = journal.entries[i - 1];
    const cur = journal.entries[i];
    if (!(cur.when > prev.when)) {
      throw new Error(
        `Migration journal is not strictly increasing: ${cur.tag} (${cur.when}) is not newer than ${prev.tag} (${prev.when})`,
      );
    }
  }

  for (const entry of journal.entries) {
    const migrationSql = fs.readFileSync(
      path.join(__dirname, `../drizzle/${entry.tag}.sql`),
      "utf-8",
    );
    sqlite.exec(migrationSql);
  }

  return drizzle(sqlite, { schema }) as unknown as import("../db/client").Db;
}

export type TestDb = ReturnType<typeof createTestDb>;

// better-sqlite3 keeps an open native handle per Database instance; closing
// it after each test avoids leaking handles across the suite (Jest warns
// about a worker failing to exit gracefully otherwise).
export function closeTestDb(db: TestDb): void {
  (db as unknown as { $client: import("better-sqlite3").Database }).$client.close();
}

export function insertAccount(
  db: TestDb,
  overrides: Partial<{
    name: string;
    type: AccountType;
    color: string;
    icon: string;
    currency: string;
    creditLimitMinor: number | null;
  }> = {},
): number {
  const [row] = db
    .insert(accounts)
    .values({
      name: overrides.name ?? "Test Account",
      type: overrides.type ?? "savings",
      color: overrides.color ?? "#000000",
      icon: overrides.icon ?? "wallet",
      currency: overrides.currency ?? "INR",
      creditLimitMinor: overrides.creditLimitMinor ?? null,
    })
    .returning({ id: accounts.id })
    .all();
  return row.id;
}
