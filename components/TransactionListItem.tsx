import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { useTransactionTagNames } from "../db/queries/tags";
import type { transactions } from "../db/schema";
import { CurrencyAmount } from "./CurrencyAmount";

type Transaction = typeof transactions.$inferSelect;

interface TransactionListItemProps {
  transaction: Transaction;
  currency: string;
  categoryName?: string;
  transferAccountName?: string;
}

const AMOUNT_STYLE = {
  income: "text-success",
  expense: "text-danger",
  transfer: "text-transfer",
} as const;

export function TransactionListItem({
  transaction,
  currency,
  categoryName,
  transferAccountName,
}: TransactionListItemProps) {
  const tagNames = useTransactionTagNames(transaction.id);

  const title = transaction.isOpeningBalance
    ? "🏦 Opening balance"
    : transaction.type === "transfer"
      ? `Transfer${transferAccountName ? ` to ${transferAccountName}` : ""}`
      : (categoryName ?? "Uncategorized");

  const sign = transaction.type === "expense" ? "-" : transaction.type === "income" ? "+" : "";

  // Opening-balance rows aren't editable via the normal transaction screen
  // (db/actions/transactions.ts blocks it) — route straight to the
  // account's own edit page instead, matching the real app's pattern.
  const editHref = transaction.isOpeningBalance
    ? `/account/${transaction.accountId}/edit`
    : `/transaction/${transaction.id}/edit`;

  return (
    <View className="border-b border-border py-3">
      <Link href={editHref} asChild>
        <Pressable className="flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-base text-fg">{title}</Text>
            {transaction.description && !transaction.isOpeningBalance ? (
              <Text className="text-sm text-fg-muted">{transaction.description}</Text>
            ) : null}
            <Text className="text-xs text-fg-subtle">
              {transaction.date.toLocaleDateString("en-IN")}
            </Text>
          </View>
          <CurrencyAmount
            amountMinor={transaction.amountMinor}
            currency={currency}
            prefix={sign}
            className={`text-base font-semibold ${AMOUNT_STYLE[transaction.type]}`}
          />
        </Pressable>
      </Link>
      {tagNames.length > 0 && (
        <View className="mt-2 flex-row flex-wrap gap-1.5">
          {tagNames.map((name) => (
            <Link key={name} href={`/tag/${encodeURIComponent(name)}`} asChild>
              <Pressable className="rounded-full bg-surface-2 px-2 py-0.5">
                <Text className="text-xs text-fg-muted">{name}</Text>
              </Pressable>
            </Link>
          ))}
        </View>
      )}
    </View>
  );
}
