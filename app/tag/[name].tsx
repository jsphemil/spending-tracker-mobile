import { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { FlatList, Text, View } from "react-native";

import { db } from "../../db/client";
import { useTagTransactions } from "../../db/queries/tags";
import { getExchangeRate } from "../../services/currency";
import { formatMoney, majorToMinor, minorToMajor } from "../../services/format";

const BASE_CURRENCY = "INR";

export default function TagSummaryScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const tagName = decodeURIComponent(name);
  const { data: rows } = useTagTransactions(tagName);

  const foreignCurrencies = useMemo(() => {
    const set = new Set<string>();
    for (const row of rows ?? []) {
      if (row.accountCurrency !== BASE_CURRENCY) set.add(row.accountCurrency);
    }
    return Array.from(set);
  }, [rows]);

  const [rates, setRates] = useState<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      foreignCurrencies.map(async (currency) => {
        const rate = await getExchangeRate(db, currency, BASE_CURRENCY);
        return [currency, rate] as const;
      }),
    ).then((entries) => {
      if (!cancelled) setRates(Object.fromEntries(entries));
    });
    return () => {
      cancelled = true;
    };
  }, [foreignCurrencies.join(",")]);

  function toBaseMinor(amountMinor: number, currency: string): number {
    if (currency === BASE_CURRENCY) return amountMinor;
    const rate = rates[currency];
    if (rate === undefined) return 0; // rate not loaded yet
    const majorInSource = minorToMajor(amountMinor, currency);
    return majorToMinor(majorInSource * rate, BASE_CURRENCY);
  }

  const totals = (rows ?? []).reduce(
    (acc, { transaction, accountCurrency }) => {
      if (transaction.type === "transfer") return acc;
      const baseMinor = toBaseMinor(transaction.amountMinor, accountCurrency);
      if (transaction.type === "income") acc.incomeMinor += baseMinor;
      else acc.expenseMinor += baseMinor;
      return acc;
    },
    { incomeMinor: 0, expenseMinor: 0 },
  );
  const netMinor = totals.incomeMinor - totals.expenseMinor;

  return (
    <View className="flex-1 bg-white">
      <FlatList
        data={rows ?? []}
        keyExtractor={({ transaction }) => String(transaction.id)}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        ListHeaderComponent={
          <View className="mb-6 gap-3">
            <Text className="text-xl font-semibold text-gray-900">{tagName}</Text>
            <Text className="text-base text-gray-700">
              Net cost of {tagName}: {formatMoney(netMinor, BASE_CURRENCY)}
            </Text>
            <View className="flex-row justify-around">
              <View className="items-center">
                <Text className="text-xs text-gray-500">Income</Text>
                <Text className="text-base font-medium text-green-600">
                  {formatMoney(totals.incomeMinor, BASE_CURRENCY)}
                </Text>
              </View>
              <View className="items-center">
                <Text className="text-xs text-gray-500">Expense</Text>
                <Text className="text-base font-medium text-red-600">
                  {formatMoney(totals.expenseMinor, BASE_CURRENCY)}
                </Text>
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          <Text className="py-8 text-center text-gray-500">
            No transactions carry this tag yet.
          </Text>
        }
        renderItem={({ item }) => (
          <View className="flex-row items-center justify-between border-b border-gray-100 py-3">
            <View className="flex-1 pr-3">
              <Text className="text-base text-gray-900">
                {item.transaction.description || item.accountName}
              </Text>
              <Text className="text-xs text-gray-400">
                {item.accountName} · {item.transaction.date.toLocaleDateString("en-IN")}
              </Text>
            </View>
            <Text
              className={
                item.transaction.type === "income" ? "text-green-600" : "text-gray-900"
              }
            >
              {formatMoney(item.transaction.amountMinor, item.accountCurrency)}
            </Text>
          </View>
        )}
      />
    </View>
  );
}
