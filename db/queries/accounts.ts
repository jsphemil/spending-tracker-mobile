import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { and, asc, eq } from "drizzle-orm";

import { db } from "../client";
import { accounts, transactions } from "../schema";

export function useAccounts() {
  return useLiveQuery(
    db.select().from(accounts).orderBy(asc(accounts.sortOrder), asc(accounts.id)),
  );
}

export function useAccount(id: number) {
  const { data, ...rest } = useLiveQuery(
    db.select().from(accounts).where(eq(accounts.id, id)),
  );
  return { account: data?.[0], ...rest };
}

export function useAccountOpeningBalance(id: number) {
  const { data } = useLiveQuery(
    db
      .select()
      .from(transactions)
      .where(
        and(eq(transactions.accountId, id), eq(transactions.isOpeningBalance, true)),
      ),
  );
  return data?.[0];
}
