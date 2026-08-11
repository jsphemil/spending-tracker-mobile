import { useMemo, useState } from "react";
import { Link, useLocalSearchParams } from "expo-router";
import { FlatList, Pressable, Text, View } from "react-native";

import { BalanceRing } from "../../../components/rings/BalanceRing";
import { CreditUsageRing } from "../../../components/rings/CreditUsageRing";
import { CurrencyAmount } from "../../../components/CurrencyAmount";
import { TransactionListItem } from "../../../components/TransactionListItem";
import { EmptyState } from "../../../components/ui/EmptyState";
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
      <View className="flex-1 items-center justify-center bg-bg">
        <Text className="text-fg">Loading…</Text>
      </View>
    );
  }

  const totals = getPeriodTotals(db, { accountId, ...range });
  // "As of" the end of the viewed period, not always today — so navigating
  // to a past month moves the Balance figure the same way Income/Expense
  // already do (services/balance.ts).
  const balanceMinor = getAccountBalanceMinor(db, accountId, range.end);
  const categoryName = (categoryId: number | null) =>
    categories?.find((c) => c.id === categoryId)?.name;

  return (
    <View className="flex-1 bg-bg">
      <FlatList
        data={periodTransactions ?? []}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16, gap: 4 }}
        ListHeaderComponent={
          <View className="mb-6 items-center gap-4">
            <View className="w-full flex-row items-center justify-between">
              <Pressable onPress={() => setPeriod((p) => shiftMonth(p, -1))} className="p-2">
                <Text className="text-lg text-fg">‹</Text>
              </Pressable>
              <Text className="text-base font-medium text-fg">
                {monthLabel(period)}
              </Text>
              <Pressable onPress={() => setPeriod((p) => shiftMonth(p, 1))} className="p-2">
                <Text className="text-lg text-fg">›</Text>
              </Pressable>
            </View>

            {account.type === "credit_card" ? (
              <CreditUsageRing
                owedMinor={getCreditCardOwedMinor(db, accountId, range.end)}
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
                <Text className="text-xs text-fg-muted">Income</Text>
                <CurrencyAmount
                  amountMinor={totals.incomeMinor}
                  currency={account.currency}
                  stacked
                  className="text-base font-medium text-success"
                />
              </View>
              <View className="items-center">
                <Text className="text-xs text-fg-muted">Expense</Text>
                <CurrencyAmount
                  amountMinor={totals.expenseMinor}
                  currency={account.currency}
                  stacked
                  className="text-base font-medium text-danger"
                />
              </View>
              <View className="items-center">
                <Text className="text-xs text-fg-muted">Balance</Text>
                <CurrencyAmount
                  amountMinor={balanceMinor}
                  currency={account.currency}
                  stacked
                  className="text-base font-medium text-fg"
                />
              </View>
            </View>

            {account.type === "credit_card" && account.creditLimitMinor != null && (
              <View className="flex-row items-center gap-1">
                <Text className="text-sm text-fg-muted">Available credit: </Text>
                <CurrencyAmount
                  amountMinor={
                    account.creditLimitMinor - getCreditCardOwedMinor(db, accountId, range.end)
                  }
                  currency={account.currency}
                  className="text-sm text-fg-muted"
                />
              </View>
            )}

            <View className="w-full flex-row gap-3">
              <Link
                href={`/transaction/new?accountId=${accountId}&type=income`}
                asChild
              >
                <Pressable className="flex-1 items-center rounded-lg bg-success py-3">
                  <Text className="font-semibold text-white">Income</Text>
                </Pressable>
              </Link>
              <Link
                href={`/transaction/new?accountId=${accountId}&type=expense`}
                asChild
              >
                <Pressable className="flex-1 items-center rounded-lg bg-danger py-3">
                  <Text className="font-semibold text-white">Expense</Text>
                </Pressable>
              </Link>
              <Link
                href={`/transaction/new?accountId=${accountId}&type=transfer`}
                asChild
              >
                <Pressable className="flex-1 items-center rounded-lg bg-transfer py-3">
                  <Text className="font-semibold text-white">Transfer</Text>
                </Pressable>
              </Link>
            </View>

            <Link href={`/account/${accountId}/edit`} asChild>
              <Pressable>
                <Text className="text-accent">Edit Account</Text>
              </Pressable>
            </Link>
          </View>
        }
        ListEmptyComponent={<EmptyState message="No transactions this month." />}
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
