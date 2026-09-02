import { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { FlatList, Text, View } from "react-native";

import { db } from "../../db/client";
import { useSettings } from "../../db/queries/settings";
import { useTagTransactions } from "../../db/queries/tags";
import { getExchangeRate } from "../../services/currency";
import { formatMoney, majorToMinor, minorToMajor } from "../../services/format";
import { EmptyState } from "../../components/ui/EmptyState";

export default function TagSummaryScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const tagName = decodeURIComponent(name);
  const { data: rows } = useTagTransactions(tagName);
  const { settings } = useSettings();
  const baseCurrency = settings?.baseCurrency ?? "INR";

  const foreignCurrencies = useMemo(() => {
    const set = new Set<string>();
    for (const row of rows ?? []) {
      if (row.accountCurrency !== baseCurrency) set.add(row.accountCurrency);
    }
    return Array.from(set);
  }, [rows, baseCurrency]);

  const [rates, setRates] = useState<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      foreignCurrencies.map(async (currency) => {
        const rate = await getExchangeRate(db, currency, baseCurrency);
        return [currency, rate] as const;
      }),
    ).then((entries) => {
      if (!cancelled) setRates(Object.fromEntries(entries));
    });
    return () => {
      cancelled = true;
    };
  }, [foreignCurrencies.join(","), baseCurrency]);

  function toBaseMinor(amountMinor: number, currency: string): number {
    if (currency === baseCurrency) return amountMinor;
    const rate = rates[currency];
    if (rate === undefined) return 0; // rate not loaded yet
    const majorInSource = minorToMajor(amountMinor, currency);
    return majorToMinor(majorInSource * rate, baseCurrency);
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
    <View className="flex-1 bg-bg">
      <FlatList
        data={rows ?? []}
        keyExtractor={({ transaction }) => String(transaction.id)}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        ListHeaderComponent={
          <View className="mb-6 gap-3">
            <Text className="text-xl font-display text-fg">{tagName}</Text>
            <Text className="text-base text-fg-muted">
              Net cost of {tagName}: {formatMoney(netMinor, baseCurrency)}
            </Text>
            <View className="flex-row justify-around">
              <View className="items-center">
                <Text className="text-xs text-fg-muted">Income</Text>
                <Text className="font-data text-base font-medium tabular-nums text-success">
                  {formatMoney(totals.incomeMinor, baseCurrency)}
                </Text>
              </View>
              <View className="items-center">
                <Text className="text-xs text-fg-muted">Expense</Text>
                <Text className="font-data text-base font-medium tabular-nums text-danger">
                  {formatMoney(totals.expenseMinor, baseCurrency)}
                </Text>
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={<EmptyState message="No transactions carry this tag yet." />}
        renderItem={({ item }) => (
          <View className="flex-row items-center justify-between border-b border-glass-border py-3">
            <View className="flex-1 pr-3">
              <Text className="text-base text-fg">
                {item.transaction.description || item.accountName}
              </Text>
              <Text className="text-xs text-fg-subtle">
                {item.accountName} · {item.transaction.date.toLocaleDateString()}
              </Text>
            </View>
            <Text
              className={`font-data tabular-nums ${
                item.transaction.type === "income" ? "text-success" : "text-fg"
              }`}
            >
              {formatMoney(item.transaction.amountMinor, item.accountCurrency)}
            </Text>
          </View>
        )}
      />
    </View>
  );
}
