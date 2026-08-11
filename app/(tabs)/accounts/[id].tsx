import { useMemo, useState } from "react";
import { Link, useLocalSearchParams } from "expo-router";
import { FlatList, Pressable, Text, View } from "react-native";

import { BalanceRing } from "../../../components/rings/BalanceRing";
import { CreditUsageRing } from "../../../components/rings/CreditUsageRing";
import { CurrencyAmount } from "../../../components/CurrencyAmount";
import { TransactionListItem } from "../../../components/TransactionListItem";
import { useAccount } from "../../../db/queries/accounts";
import { useCategories } from "../../../db/queries/categories";
import { useAccountTransactions } from "../../../db/queries/transactions";
import { getAccountBalanceMinor, getCreditCardOwedMinor, getPeriodTotals } from "../../../services/balance";
import { currentMonthPeriod, monthLabel, monthRange, shiftMonth } from "../../../services/period";
import { db } from "../../../db/client";

export default function AccountDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const accountId = Number(id);
  const { account } = useAccount(accountId);
  const [period, setPeriod] = useState(currentMonthPeriod());
  const { data: categories } = useCategories();
  const range = useMemo(() => monthRange(period), [period]);
  const { data: periodTransactions } = useAccountTransactions(accountId, range);

  if (!account) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text>Loading…</Text>
      </View>
    );
  }

  const totals = getPeriodTotals(db, { accountId, ...range });
  const balanceMinor = getAccountBalanceMinor(db, accountId);
  const categoryName = (categoryId: number | null) =>
    categories?.find((c) => c.id === categoryId)?.name;

  return (
    <View className="flex-1 bg-white">
      <FlatList
        data={periodTransactions ?? []}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16, gap: 4 }}
        ListHeaderComponent={
          <View className="mb-6 items-center gap-4">
            <View className="w-full flex-row items-center justify-between">
              <Pressable onPress={() => setPeriod((p) => shiftMonth(p, -1))} className="p-2">
                <Text className="text-lg">‹</Text>
              </Pressable>
              <Text className="text-base font-medium text-gray-900">
                {monthLabel(period)}
              </Text>
              <Pressable onPress={() => setPeriod((p) => shiftMonth(p, 1))} className="p-2">
                <Text className="text-lg">›</Text>
              </Pressable>
            </View>

            {account.type === "credit_card" ? (
              <CreditUsageRing
                owedMinor={getCreditCardOwedMinor(db, accountId)}
                creditLimitMinor={account.creditLimitMinor ?? 0}
                currency={account.currency}
              />
            ) : (
              <BalanceRing
                incomeMinor={totals.incomeMinor}
                expenseMinor={totals.expenseMinor}
                currency={account.currency}
              />
            )}

            <View className="w-full flex-row justify-around">
              <View className="items-center">
                <Text className="text-xs text-gray-500">Income</Text>
                <CurrencyAmount
                  amountMinor={totals.incomeMinor}
                  currency={account.currency}
                  className="text-base font-medium text-green-600"
                />
              </View>
              <View className="items-center">
                <Text className="text-xs text-gray-500">Expense</Text>
                <CurrencyAmount
                  amountMinor={totals.expenseMinor}
                  currency={account.currency}
                  className="text-base font-medium text-red-600"
                />
              </View>
              <View className="items-center">
                <Text className="text-xs text-gray-500">Balance</Text>
                <CurrencyAmount
                  amountMinor={balanceMinor}
                  currency={account.currency}
                  className="text-base font-medium text-gray-900"
                />
              </View>
            </View>

            {account.type === "credit_card" && account.creditLimitMinor != null && (
              <View className="flex-row items-center gap-1">
                <Text className="text-sm text-gray-500">Available credit: </Text>
                <CurrencyAmount
                  amountMinor={account.creditLimitMinor - getCreditCardOwedMinor(db, accountId)}
                  currency={account.currency}
                  className="text-sm text-gray-500"
                />
              </View>
            )}

            <View className="w-full flex-row gap-3">
              <Link
                href={`/transaction/new?accountId=${accountId}&type=income`}
                asChild
              >
                <Pressable className="flex-1 items-center rounded-lg bg-green-600 py-3">
                  <Text className="font-semibold text-white">Income</Text>
                </Pressable>
              </Link>
              <Link
                href={`/transaction/new?accountId=${accountId}&type=expense`}
                asChild
              >
                <Pressable className="flex-1 items-center rounded-lg bg-red-600 py-3">
                  <Text className="font-semibold text-white">Expense</Text>
                </Pressable>
              </Link>
              <Link
                href={`/transaction/new?accountId=${accountId}&type=transfer`}
                asChild
              >
                <Pressable className="flex-1 items-center rounded-lg bg-blue-600 py-3">
                  <Text className="font-semibold text-white">Transfer</Text>
                </Pressable>
              </Link>
            </View>

            <Link href={`/account/${accountId}/edit`} asChild>
              <Pressable>
                <Text className="text-blue-600">Edit Account</Text>
              </Pressable>
            </Link>
          </View>
        }
        ListEmptyComponent={
          <Text className="py-8 text-center text-gray-500">
            No transactions this month.
          </Text>
        }
        renderItem={({ item }) => (
          <TransactionListItem
            transaction={item}
            currency={account.currency}
            categoryName={categoryName(item.categoryId)}
          />
        )}
      />
    </View>
  );
}
