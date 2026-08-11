import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { useMemo } from "react";

import { db } from "../client";
import { transactions } from "../schema";

// Reactive per-account balances for list/dashboard views, recomputed in JS
// from every transaction row whenever the transactions table changes. For
// a single account's own page, services/balance.ts's SQL-aggregated
// getAccountBalanceMinor is the more efficient one-off query.
export function useAccountBalances(): Record<number, number> {
  const { data } = useLiveQuery(
    db
      .select({
        accountId: transactions.accountId,
        toAccountId: transactions.toAccountId,
        type: transactions.type,
        amountMinor: transactions.amountMinor,
      })
      .from(transactions),
  );

  return useMemo(() => {
    const balances: Record<number, number> = {};
    for (const row of data ?? []) {
      if (row.type === "income") {
        balances[row.accountId] = (balances[row.accountId] ?? 0) + row.amountMinor;
      } else if (row.type === "expense") {
        balances[row.accountId] = (balances[row.accountId] ?? 0) - row.amountMinor;
      } else if (row.type === "transfer") {
        balances[row.accountId] = (balances[row.accountId] ?? 0) - row.amountMinor;
        if (row.toAccountId != null) {
          balances[row.toAccountId] = (balances[row.toAccountId] ?? 0) + row.amountMinor;
        }
      }
    }
    return balances;
  }, [data]);
}
