import { useEffect, useMemo, useState } from "react";
import { Link } from "expo-router";
import { FlatList, Pressable, ScrollView, Text, View } from "react-native";

import { SummaryBand } from "../../../components/SummaryBand";
import { TransactionListItem } from "../../../components/TransactionListItem";
import { EmptyState } from "../../../components/ui/EmptyState";
import { db } from "../../../db/client";
import { useAccounts } from "../../../db/queries/accounts";
import { useCategories } from "../../../db/queries/categories";
import { useFilteredTransactions } from "../../../db/queries/transactions";
import { getRatesToINR } from "../../../services/currency";
import { majorToMinor, minorToMajor } from "../../../services/format";
import { currentMonthPeriod, monthLabel, monthRange, shiftMonth } from "../../../services/period";

const BASE_CURRENCY = "INR";

export default function TransactionsListScreen() {
  const [period, setPeriod] = useState(currentMonthPeriod());
  const [accountId, setAccountId] = useState<number | undefined>(undefined);
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);

  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();
  const range = useMemo(() => monthRange(period), [period]);
  const { data: rows } = useFilteredTransactions({ accountId, categoryId, range });

  // When a single account is selected every row already shares that
  // account's currency, so the band shows it natively. Across "All
  // Accounts" the rows can mix currencies — everything gets converted to
  // INR before summing (matching the Dashboard's toBaseMinor pattern)
  // instead of adding raw minor units of different currencies together.
  const currency = accountId
    ? accounts?.find((a) => a.id === accountId)?.currency ?? "INR"
    : BASE_CURRENCY;

  const foreignCurrencies = useMemo(() => {
    const set = new Set<string>();
    for (const a of accounts ?? []) {
      if (a.currency !== BASE_CURRENCY) set.add(a.currency);
    }
    return Array.from(set);
  }, [accounts]);

  const [rates, setRates] = useState<Record<string, number>>({});
  useEffect(() => {
    let cancelled = false;
    getRatesToINR(db, foreignCurrencies).then((result) => {
      if (!cancelled) setRates(result);
    });
    return () => {
      cancelled = true;
    };
  }, [foreignCurrencies.join(",")]);

  function toBaseMinor(amountMinor: number, txCurrency: string): number {
    if (txCurrency === BASE_CURRENCY) return amountMinor;
    const rate = rates[txCurrency];
    if (rate === undefined) return 0;
    return majorToMinor(minorToMajor(amountMinor, txCurrency) * rate, BASE_CURRENCY);
  }

  const totals = (rows ?? []).reduce(
    (acc, t) => {
      const txCurrency = accounts?.find((a) => a.id === t.accountId)?.currency ?? "INR";
      const amountMinor = accountId ? t.amountMinor : toBaseMinor(t.amountMinor, txCurrency);
      if (t.type === "income") acc.incomeMinor += amountMinor;
      if (t.type === "expense") acc.expenseMinor += amountMinor;
      return acc;
    },
    { incomeMinor: 0, expenseMinor: 0 },
  );

  const categoryName = (id: number | null) => categories?.find((c) => c.id === id)?.name;
  const accountName = (id: number | null) => accounts?.find((a) => a.id === id)?.name;

  return (
    <View className="flex-1 bg-bg">
      <View className="gap-3 border-b border-border p-4">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => setPeriod((p) => shiftMonth(p, -1))} className="p-2">
            <Text className="text-lg text-fg">‹</Text>
          </Pressable>
          <Text className="text-base font-medium text-fg">{monthLabel(period)}</Text>
          <Pressable onPress={() => setPeriod((p) => shiftMonth(p, 1))} className="p-2">
            <Text className="text-lg text-fg">›</Text>
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
          <Pressable
            onPress={() => setAccountId(undefined)}
            className={`mr-2 rounded-full border px-3 py-1.5 ${
              accountId === undefined ? "border-accent bg-accent-soft" : "border-border"
            }`}
          >
            <Text className={accountId === undefined ? "text-accent" : "text-fg-muted"}>
              All Accounts
            </Text>
          </Pressable>
          {(accounts ?? []).map((a) => (
            <Pressable
              key={a.id}
              onPress={() => setAccountId(a.id)}
              className={`mr-2 rounded-full border px-3 py-1.5 ${
                accountId === a.id ? "border-accent bg-accent-soft" : "border-border"
              }`}
            >
              <Text className={accountId === a.id ? "text-accent" : "text-fg-muted"}>
                {a.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
          <Pressable
            onPress={() => setCategoryId(undefined)}
            className={`mr-2 rounded-full border px-3 py-1.5 ${
              categoryId === undefined ? "border-accent bg-accent-soft" : "border-border"
            }`}
          >
            <Text className={categoryId === undefined ? "text-accent" : "text-fg-muted"}>
              All Categories
            </Text>
          </Pressable>
          {(categories ?? []).map((c) => (
            <Pressable
              key={c.id}
              onPress={() => setCategoryId(c.id)}
              className={`mr-2 rounded-full border px-3 py-1.5 ${
                categoryId === c.id ? "border-accent bg-accent-soft" : "border-border"
              }`}
            >
              <Text className={categoryId === c.id ? "text-accent" : "text-fg-muted"}>
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
        ListEmptyComponent={<EmptyState message="No transactions for this filter." />}
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
        <Pressable className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-accent">
          <Text className="text-2xl text-white">+</Text>
        </Pressable>
      </Link>
    </View>
  );
}
