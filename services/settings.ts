import type { accounts, settings } from "../db/schema";

type Account = typeof accounts.$inferSelect;
type Settings = typeof settings.$inferSelect;

// null on the account row means "inherit the global setting"; a real
// boolean is an explicit per-account override. Same pattern for both
// Budget Mode and Show/Hide Future Transactions (spec.md §5.5, §5.6).
export function resolveAccountSettings(account: Account, globalSettings: Settings) {
  return {
    budgetModeEnabled: account.budgetModeEnabled ?? globalSettings.budgetModeGlobal,
    showFutureTxEnabled:
      account.showFutureTxEnabled ?? globalSettings.showFutureTxGlobal,
  };
}
