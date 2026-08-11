import type { AccountType } from "../db/schema";

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  savings: "Savings",
  investment: "Investment",
  deposit: "Deposit",
  wallet: "Wallet / Cash",
  credit_card: "Credit Card",
};

export const ACCOUNT_TYPE_ICONS: Record<AccountType, string> = {
  savings: "piggy-bank",
  investment: "trending-up",
  deposit: "bank",
  wallet: "wallet",
  credit_card: "credit-card",
};
