import type { accounts } from "../db/schema";

type Account = typeof accounts.$inferSelect;

// Accounts you spend day-to-day from count by default; deposits,
// investments and credit cards don't. The account's own toggle wins.
// Mirrored in WidgetSqliteReader.kt — keep the two in step.
export function countsTowardSafeToSpend(account: Pick<Account, "type" | "safeToSpendEnabled">): boolean {
  return account.safeToSpendEnabled ?? (account.type === "savings" || account.type === "wallet");
}

// What's left to spend in the account — the Account Detail screen's
// "Left to spend": the balance, or available credit for a credit card.
export function leftToSpendMinor(account: Pick<Account, "type" | "creditLimitMinor">, balanceMinor: number): number {
  if (account.type === "credit_card" && account.creditLimitMinor != null) {
    return account.creditLimitMinor - Math.max(0, -balanceMinor);
  }
  return balanceMinor;
}

// Per day for the rest of the month (today included), rounded the same way
// Account Detail's own figure is. Nothing to spend once at or below zero.
export function safeToSpendPerDayMinor(leftMinor: number, daysRemaining: number): number {
  return leftMinor > 0 && daysRemaining > 0 ? Math.round(leftMinor / daysRemaining) : 0;
}
