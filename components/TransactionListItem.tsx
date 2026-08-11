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
  income: "text-green-600",
  expense: "text-red-600",
  transfer: "text-gray-700",
} as const;

export function TransactionListItem({
  transaction,
  currency,
  categoryName,
  transferAccountName,
}: TransactionListItemProps) {
  const tagNames = useTransactionTagNames(transaction.id);

  const title =
    transaction.type === "transfer"
      ? `Transfer${transferAccountName ? ` to ${transferAccountName}` : ""}`
      : (categoryName ?? "Uncategorized");

  const sign = transaction.type === "expense" ? "-" : transaction.type === "income" ? "+" : "";

  return (
    <View className="border-b border-gray-100 py-3">
      <Link href={`/transaction/${transaction.id}/edit`} asChild>
        <Pressable className="flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-base text-gray-900">{title}</Text>
            {transaction.description ? (
              <Text className="text-sm text-gray-500">{transaction.description}</Text>
            ) : null}
            <Text className="text-xs text-gray-400">
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
              <Pressable className="rounded-full bg-gray-100 px-2 py-0.5">
                <Text className="text-xs text-gray-600">{name}</Text>
              </Pressable>
            </Link>
          ))}
        </View>
      )}
    </View>
  );
}
