import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { and, asc, desc, gte, isNotNull } from "drizzle-orm";

import { db } from "../client";
import { recurringRules, transactions } from "../schema";

// All rules, active or closed. Commitments decides which to show: active
// rules, plus a closed rule (ended by an "edit this and future" split) while
// it still has an already-generated occurrence that hasn't happened yet.
export function useRecurringRules() {
  return useLiveQuery(db.select().from(recurringRules).orderBy(desc(recurringRules.amountMinor)));
}

// Generated occurrences dated today or later, soonest first — the real rows
// that will post, including "just this one" edits.
export function useUpcomingRecurringTransactions(today: Date) {
  return useLiveQuery(
    db
      .select({
        id: transactions.id,
        recurringRuleId: transactions.recurringRuleId,
        amountMinor: transactions.amountMinor,
        date: transactions.date,
      })
      .from(transactions)
      .where(and(isNotNull(transactions.recurringRuleId), gte(transactions.date, today)))
      .orderBy(asc(transactions.date), asc(transactions.id)),
    [today.getTime()],
  );
}
