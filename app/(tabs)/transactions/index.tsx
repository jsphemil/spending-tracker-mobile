import { useMemo, useState } from "react";
import { Link } from "expo-router";
import { FlatList, Pressable, ScrollView, Text, View } from "react-native";

import { SummaryBand } from "../../../components/SummaryBand";
import { TransactionListItem } from "../../../components/TransactionListItem";
import { useAccounts } from "../../../db/queries/accounts";
import { useCategories } from "../../../db/queries/categories";
import { useFilteredTransactions } from "../../../db/queries/transactions";
import { currentMonthPeriod, monthLabel, monthRange, shiftMonth } from "../../../services/period";

export default function TransactionsListScreen() {
  const [period, setPeriod] = useState(currentMonthPeriod());
  const [accountId, setAccountId] = useState<number | undefined>(undefined);
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);

  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();
  const range = useMemo(() => monthRange(period), [period]);
  const { data: rows } = useFilteredTransactions({ accountId, categoryId, range });

  const currency = accountId
    ? accounts?.find((a) => a.id === accountId)?.currency ?? "INR"
    : "INR";

  const totals = (rows ?? []).reduce(
    (acc, t) => {
      if (t.type === "income") acc.incomeMinor += t.amountMinor;
      if (t.type === "expense") acc.expenseMinor += t.amountMinor;
      return acc;
    },
    { incomeMinor: 0, expenseMinor: 0 },
  );

  const categoryName = (id: number | null) => categories?.find((c) => c.id === id)?.name;
  const accountName = (id: number | null) => accounts?.find((a) => a.id === id)?.name;

  return (
    <View className="flex-1 bg-white">
      <View className="gap-3 border-b border-gray-100 p-4">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => setPeriod((p) => shiftMonth(p, -1))} className="p-2">
            <Text className="text-lg">‹</Text>
          </Pressable>
          <Text className="text-base font-medium text-gray-900">{monthLabel(period)}</Text>
          <Pressable onPress={() => setPeriod((p) => shiftMonth(p, 1))} className="p-2">
            <Text className="text-lg">›</Text>
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
          <Pressable
            onPress={() => setAccountId(undefined)}
            className={`mr-2 rounded-full border px-3 py-1.5 ${
              accountId === undefined ? "border-blue-600 bg-blue-50" : "border-gray-200"
            }`}
          >
            <Text className={accountId === undefined ? "text-blue-600" : "text-gray-700"}>
              All Accounts
            </Text>
          </Pressable>
          {(accounts ?? []).map((a) => (
            <Pressable
              key={a.id}
              onPress={() => setAccountId(a.id)}
              className={`mr-2 rounded-full border px-3 py-1.5 ${
                accountId === a.id ? "border-blue-600 bg-blue-50" : "border-gray-200"
              }`}
            >
              <Text className={accountId === a.id ? "text-blue-600" : "text-gray-700"}>
                {a.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
          <Pressable
            onPress={() => setCategoryId(undefined)}
            className={`mr-2 rounded-full border px-3 py-1.5 ${
              categoryId === undefined ? "border-blue-600 bg-blue-50" : "border-gray-200"
            }`}
          >
            <Text className={categoryId === undefined ? "text-blue-600" : "text-gray-700"}>
              All Categories
            </Text>
          </Pressable>
          {(categories ?? []).map((c) => (
            <Pressable
              key={c.id}
              onPress={() => setCategoryId(c.id)}
              className={`mr-2 rounded-full border px-3 py-1.5 ${
                categoryId === c.id ? "border-blue-600 bg-blue-50" : "border-gray-200"
              }`}
            >
              <Text className={categoryId === c.id ? "text-blue-600" : "text-gray-700"}>
                {c.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <SummaryBand
          incomeMinor={totals.incomeMinor}
          expenseMinor={totals.expenseMinor}
          currency={currency}
        />
      </View>

      <FlatList
        data={rows ?? []}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <Text className="py-8 text-center text-gray-500">
            No transactions for this filter.
          </Text>
        }
        renderItem={({ item }) => (
          <TransactionListItem
            transaction={item}
            currency={accounts?.find((a) => a.id === item.accountId)?.currency ?? "INR"}
            categoryName={categoryName(item.categoryId)}
            transferAccountName={
              item.type === "transfer" ? accountName(item.toAccountId) : undefined
            }
          />
        )}
      />

      <Link href="/transaction/new" asChild>
        <Pressable className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-blue-600">
          <Text className="text-2xl text-white">+</Text>
        </Pressable>
      </Link>
    </View>
  );
}
