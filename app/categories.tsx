import { useEffect, useMemo, useState } from "react";
import { Icon } from "../components/ui/Icon";
import { Link } from "expo-router";
import { FlatList, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAccounts } from "../db/queries/accounts";
import { useCategories } from "../db/queries/categories";
import { useSettings } from "../db/queries/settings";
import { useFilteredTransactions } from "../db/queries/transactions";
import type { CategoryKind } from "../db/schema";
import { db } from "../db/client";
import { GlobalFab } from "../components/GlobalFab";
import { GlobalHeader } from "../components/GlobalHeader";
import { getRatesToBase } from "../services/currency";
import { formatMoney, majorToMinor, minorToMajor } from "../services/format";
import { currentMonthPeriod, monthRange } from "../services/period";
import { ensureMaterialized } from "../services/recurrence";
import { EmptyState } from "../components/ui/EmptyState";
import { useThemeColors } from "../theme/palette";

export default function CategoriesScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const [kind, setKind] = useState<CategoryKind>("expense");
  const { settings } = useSettings();
  const baseCurrency = settings?.baseCurrency ?? "INR";
  const { data: categories } = useCategories(kind);
  const { data: accounts } = useAccounts();

  // Budgets are always "this month," no month-nav — matches the real app's
  // categories/page.tsx design note.
  const range = useMemo(() => monthRange(currentMonthPeriod()), []);
  useEffect(() => {
    ensureMaterialized(db, { through: range.end });
  }, [range.end]);
  const { data: monthTransactions } = useFilteredTransactions({ range });

  const foreignCurrencies = useMemo(() => {
    const set = new Set<string>();
    for (const a of accounts ?? []) {
      if (a.currency !== baseCurrency) set.add(a.currency);
    }
    return Array.from(set);
  }, [accounts, baseCurrency]);

  const [rates, setRates] = useState<Record<string, number>>({});
  useEffect(() => {
    let cancelled = false;
    getRatesToBase(db, foreignCurrencies, baseCurrency).then((result) => {
      if (!cancelled) setRates(result);
    });
    return () => {
      cancelled = true;
    };
  }, [foreignCurrencies.join(","), baseCurrency]);

  function toBaseMinor(amountMinor: number, currency: string): number {
    if (currency === baseCurrency) return amountMinor;
    const rate = rates[currency];
    if (rate === undefined) return 0;
    return majorToMinor(minorToMajor(amountMinor, currency) * rate, baseCurrency);
  }

  // Sums whichever transaction type matches the active tab — previously
  // hardcoded to "expense" only, which meant the Income tab always showed
  // ₹0 for every category regardless of actual income transactions.
  const spentByCategoryMinor = useMemo(() => {
    const totals = new Map<number, number>();
    for (const t of monthTransactions ?? []) {
      if (t.type !== kind || t.categoryId === null) continue;
      const accountCurrency = accounts?.find((a) => a.id === t.accountId)?.currency ?? "INR";
      const prior = totals.get(t.categoryId) ?? 0;
      totals.set(t.categoryId, prior + toBaseMinor(t.amountMinor, accountCurrency));
    }
    return totals;
  }, [monthTransactions, accounts, rates, kind]);

  return (
    <View className="flex-1 bg-bg">
      <GlobalHeader />
      <View className="flex-row items-center gap-2 p-4">
        {(["expense", "income"] as const).map((k) => (
          <Pressable
            key={k}
            onPress={() => setKind(k)}
            className={`flex-1 items-center rounded-lg border py-2 ${
              kind === k ? "border-accent bg-accent-soft" : "border-glass-border bg-glass"
            }`}
          >
            <Text className={kind === k ? "text-accent" : "text-fg-muted"}>
              {k === "expense" ? "Expense" : "Income"}
            </Text>
          </Pressable>
        ))}
        <Link href={`/category/new?kind=${kind}`} asChild>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="New category"
            className="h-10 w-10 items-center justify-center rounded-full bg-glass"
          >
            <Icon name="plus" size={18} color={colors.fg} />
          </Pressable>
        </Link>
      </View>

      <FlatList
        data={categories ?? []}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 96, gap: 8 }}
        ListEmptyComponent={<EmptyState message="No categories yet." />}
        renderItem={({ item }) => {
          const spentMinor = spentByCategoryMinor.get(item.id) ?? 0;
          const hasBudget = item.kind === "expense" && item.monthlyBudgetMinor != null;
          const budgetMinor = item.monthlyBudgetMinor ?? 0;
          const fraction = hasBudget && budgetMinor > 0 ? spentMinor / budgetMinor : 0;
          const overBudget = hasBudget && spentMinor > budgetMinor;

          return (
            <Link href={`/category/${item.id}/edit`} asChild>
              <Pressable className="gap-2 rounded-card border border-glass-border bg-glass p-3">
                <View className="flex-row items-center gap-3">
                  <View
                    style={{ backgroundColor: item.color }}
                    className="h-9 w-9 items-center justify-center rounded-full"
                  >
                    {/* Intentionally a literal white, not a theme token — this
                        renders against the category's own arbitrary user-picked
                        color swatch, not a themed surface. */}
                    <Icon name={item.icon} size={16} color="#fff" />
                  </View>
                  <Text className="flex-1 text-base text-fg">{item.name}</Text>
                  <Text className={`font-data text-xs tabular-nums ${overBudget ? "text-danger" : "text-fg-muted"}`}>
                    {hasBudget
                      ? `${formatMoney(spentMinor, baseCurrency)} / ${formatMoney(budgetMinor, baseCurrency)}`
                      : formatMoney(spentMinor, baseCurrency)}
                  </Text>
                </View>
                {hasBudget && (
                  <View className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                    <View
                      className={`h-full rounded-full ${overBudget ? "bg-danger" : "bg-accent"}`}
                      style={{ width: `${Math.min(fraction, 1) * 100}%` }}
                    />
                  </View>
                )}
              </Pressable>
            </Link>
          );
        }}
      />
      <GlobalFab />
    </View>
  );
}
