import { drizzle } from "drizzle-orm/expo-sqlite";
import { openDatabaseSync } from "expo-sqlite";

import * as schema from "./schema";

export const sqliteDb = openDatabaseSync("spending-tracker.db", {
  enableChangeListener: true,
});

// SQLite disables foreign key enforcement by default; without this, the
// onDelete: restrict/cascade/set null rules in schema.ts are silently
// no-ops and deleting an account with transactions would succeed and
// orphan them instead of being blocked.
sqliteDb.execSync("PRAGMA foreign_keys = ON;");

export const db = drizzle(sqliteDb, { schema });

export type Db = typeof db;
