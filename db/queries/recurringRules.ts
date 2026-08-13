import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { desc, eq } from "drizzle-orm";

import { db } from "../client";
import { recurringRules } from "../schema";

// Powers the Commitments screen — only active rules count as a current
// commitment; a closed-off rule (superseded by an "edit this and future"
// split, or explicitly deleted-going-forward) shouldn't still show up here.
export function useActiveRecurringRules() {
  return useLiveQuery(
    db
      .select()
      .from(recurringRules)
      .where(eq(recurringRules.isActive, true))
      .orderBy(desc(recurringRules.amountMinor)),
  );
}
