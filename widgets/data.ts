import { inArray } from "drizzle-orm";

import { db } from "../db/client";
import { accounts } from "../db/schema";
import { getAccountBalanceMinor } from "../services/balance";
import { formatMoney } from "../services/format";
import type { AccountsWidgetAccount } from "./AccountsWidget";

// "Just the current balance" means as-of-right-now, matching how the
// rest of the app (e.g. the Accounts list screen, which passes the
// viewed month's end) computes "current" — NOT the true lifetime total,
// which would include already-materialized future-dated recurring
// occurrences and read as a bigger, misleading number.
export function getAccountsWidgetData(accountIds: number[]): AccountsWidgetAccount[] {
  if (accountIds.length === 0) return [];

  const now = new Date();
  const rows = db.select().from(accounts).where(inArray(accounts.id, accountIds)).all();
  const byId = new Map(rows.map((r) => [r.id, r]));

  // Preserve the order the user picked them in during configuration,
  // not whatever order the DB happens to return; silently drops any
  // id whose account was since deleted.
  return accountIds
    .map((id) => byId.get(id))
    .filter((r): r is (typeof rows)[number] => r != null)
    .map((r) => ({
      id: r.id,
      name: r.name,
      balanceText: formatMoney(getAccountBalanceMinor(db, r.id, now), r.currency),
    }));
}
