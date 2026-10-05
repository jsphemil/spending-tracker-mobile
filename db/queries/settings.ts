import { createContext, useContext } from "react";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";

import { db } from "../client";
import { settings } from "../schema";

type Settings = typeof settings.$inferSelect;

// Single-row table (seeded with id=1 in db/seed.ts on first launch).
//
// Performance (spec.md §5.24): settings used to be one live query per
// component that asked — every transaction row's amount, every header,
// every chart — so a long list ran dozens of identical queries on mount
// and again on every write. Now app/_layout.tsx runs the one live query
// (useSettingsQuery) and shares the row through SettingsProvider;
// useSettings() just reads it.
export function useSettingsQuery() {
  const { data } = useLiveQuery(db.select().from(settings).limit(1));
  return data?.[0];
}

const SettingsContext = createContext<Settings | undefined>(undefined);
export const SettingsProvider = SettingsContext.Provider;

export function useSettings(): { settings: Settings | undefined } {
  return { settings: useContext(SettingsContext) };
}
