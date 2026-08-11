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
export function createTestDb() {
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");

  const migrationSql = fs.readFileSync(
    path.join(__dirname, "../drizzle/0000_nasty_hercules.sql"),
    "utf-8",
  );
  sqlite.exec(migrationSql);

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
