import { useLiveQuery } from "drizzle-orm/expo-sqlite";

import { db } from "../client";
import { settings } from "../schema";

// Single-row table (seeded with id=1 in db/seed.ts on first launch).
export function useSettings() {
  const { data, ...rest } = useLiveQuery(db.select().from(settings).limit(1));
  return { settings: data?.[0], ...rest };
}
