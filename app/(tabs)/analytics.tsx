import { useEffect, useMemo, useState } from "react";
import { Link } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Icon } from "../../components/ui/Icon";

import { AssetAllocationChart } from "../../components/charts/AssetAllocationChart";
import { NetWorthTrendChart } from "../../components/charts/NetWorthTrendChart";
import { GlobalHeader } from "../../components/GlobalHeader";
import { db } from "../../db/client";
import { useAccounts } from "../../db/queries/accounts";
import { useCategories } from "../../db/queries/categories";
import { useSettings } from "../../db/queries/settings";
import { useFilteredTransactions } from "../../db/queries/transactions";
import { getAccountBalanceMinor, getEarliestTransactionDate, getNetWorthSeries } from "../../services/balance";
import { addToBucket, sortedBuckets, type Bucket } from "../../services/breakdown";
import { getRatesToBase } from "../../services/currency";
import { formatMoney, majorToMinor, minorToMajor } from "../../services/format";
import {
  currentMonthPeriod,
  monthLabel,
  monthRange,
  monthShortLabel,
  monthsBetween,
  shiftMonth,
  type MonthPeriod,
} from "../../services/period";
import { ensureMaterialized } from "../../services/recurrence";
import { TAB_BAR_CLEARANCE } from "../../theme/tabBar";
import { useThemeColors } from "../../theme/palette";
import type { CategoryKind } from "../../db/schema";

const ASSET_ALLOCATION_BUCKETS = [
  { name: "Liquid (Savings/Wallet)", types: ["savings", "wallet"], color: "#7c6ef2" },
  { name: "Deposits (FD/RD)", types: ["deposit"], color: "#f0a63a" },
  { name: "Invested", types: ["investment"], color: "#3aa0c9" },
] as const;

const TREND_MONTHS_CAP = 24;

// The deeper, exploratory counterpart to the concise Dashboard (spec.md
// §5.19 "Analytics (new tab)") — category composition, a longer net worth
// trend, and asset allocation, all reusing the same domain calculations the
// old Dashboard and Account Detail already used. No new aggregates.
export default function AnalyticsScreen() {
  const colors = useThemeColors();
  const [period, setPeriod] = useState(currentMonthPeriod());
  const [kind, setKind] = useState<CategoryKind>("expense");
  const range = useMemo(() => monthRange(period), [period]);
  useEffect(() => {
    ensureMaterialized(db, { through: range.end });
  }, [range.end]);

  const { settings } = useSettings();
  const baseCurrency = settings?.baseCurrency ?? "INR";
  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();
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

  const categoryInfo = (id: number | null) => categories?.find((c) => c.id === id);

  const byCategory = useMemo(() => {
    const map = new Map<string, Bucket>();
    for (const t of monthTransactions ?? []) {
      if (t.type !== kind) continue;
      const accountCurrency = accounts?.find((a) => a.id === t.accountId)?.currency ?? baseCurrency;
      addToBucket(
        map,
        t.categoryId ?? "uncategorized",
        categoryInfo(t.categoryId)?.name ?? "Uncategorized",
        categoryInfo(t.categoryId)?.icon ?? "❓",
        categoryInfo(t.categoryId) ? "mdi" : "emoji",
        toBaseMinor(t.amountMinor, accountCurrency),
      );
    }
    return sortedBuckets(map);
  }, [monthTransactions, accounts, categories, kind, rates, baseCurrency]);
  const categoryTotal = byCategory.reduce((sum, b) => sum + b.totalMinor, 0);

  const accountBalanceAtEnd = new Map(
    (accounts ?? []).map((a) => [a.id, getAccountBalanceMinor(db, a.id, range.end)]),
  );
  const assetAllocation = ASSET_ALLOCATION_BUCKETS.map((bucket) => ({
    name: bucket.name,
    color: bucket.color,
    valueMinor: (accounts ?? [])
      .filter((a) => (bucket.types as readonly string[]).includes(a.type))
      .reduce((sum, a) => sum + Math.max(0, toBaseMinor(accountBalanceAtEnd.get(a.id) ?? 0, a.currency)), 0),
  })).filter((b) => b.valueMinor > 0);

  const earliestTransactionDate = getEarliestTransactionDate(db);
  const earliestPeriod: MonthPeriod = earliestTransactionDate
    ? { year: earliestTransactionDate.getFullYear(), month: earliestTransactionDate.getMonth() }
    : period;
  const trendLength = Math.min(TREND_MONTHS_CAP, Math.max(1, monthsBetween(earliestPeriod, period) + 1));
  const trendMonths = Array.from({ length: trendLength }, (_, i) => shiftMonth(period, i - (trendLength - 1)));
  const trendCutoffs = trendMonths.map((mk) => monthRange(mk).end);
  const netWorthSeries = accounts
    ? getNetWorthSeries(db, accounts.map((a) => ({ id: a.id, currency: a.currency })), trendCutoffs, toBaseMinor)
    : [];
  const trendData = trendMonths.map((mk, i) => ({
    label: monthShortLabel(mk),
    valueMinor: netWorthSeries[i] ?? 0,
  }));

  const card = "rounded-card border border-glass-border bg-glass p-4";
  const cardTitle = "mb-3 text-sm font-display text-fg";

  return (
    <View className="flex-1 bg-bg">
      <GlobalHeader />
      <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ padding: 16, paddingBottom: TAB_BAR_CLEARANCE, gap: 12 }}>
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => setPeriod((p) => shiftMonth(p, -1))} className="p-3" hitSlop={8}>
            <Icon name="chevron-left" size={28} color={colors.fg} />
          </Pressable>
          <Text className="text-base font-medium text-fg">{monthLabel(period)}</Text>
          <Pressable onPress={() => setPeriod((p) => shiftMonth(p, 1))} className="p-3" hitSlop={8}>
            <Icon name="chevron-right" size={28} color={colors.fg} />
          </Pressable>
        </View>

        <View className={card}>
          <View className="mb-1 flex-row items-center justify-between">
            <Text className={cardTitle}>Net worth trend</Text>
            <Text className="text-[10px] font-medium uppercase tracking-wide text-fg-subtle">
              {trendLength >= TREND_MONTHS_CAP ? `Last ${TREND_MONTHS_CAP} months` : `Since ${monthShortLabel(trendMonths[0])}`}
            </Text>
          </View>
          <NetWorthTrendChart data={trendData} currency={baseCurrency} height={180} />
        </View>

        <View className={card}>
          <Text className={cardTitle}>Asset allocation</Text>
          {assetAllocation.length > 0 ? (
            <AssetAllocationChart data={assetAllocation} currency={baseCurrency} />
          ) : (
            <Text className="text-sm text-fg-muted">No positive balances yet.</Text>
          )}
        </View>

        <View className={card}>
          <View className="mb-3 flex-row gap-2">
            {(["expense", "income"] as const).map((k) => (
              <Pressable
                key={k}
                onPress={() => setKind(k)}
                className={`flex-1 items-center rounded-lg border py-2 ${
                  kind === k ? "border-accent bg-accent-soft" : "border-glass-border"
                }`}
              >
                <Text className={kind === k ? "text-accent" : "text-fg-muted"}>
                  {k === "expense" ? "Spending by category" : "Income by category"}
                </Text>
              </Pressable>
            ))}
          </View>
          {byCategory.length === 0 ? (
            <Text className="text-sm text-fg-muted">Nothing recorded this month.</Text>
          ) : (
            <View className="gap-2.5">
              {byCategory.map((bucket) => {
                const fraction = categoryTotal > 0 ? bucket.totalMinor / categoryTotal : 0;
                return (
                  <View key={bucket.key}>
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1 flex-row items-center gap-2">
                        {bucket.iconType === "mdi" ? (
                          <Icon name={bucket.icon} size={14} color={colors.fgMuted} />
                        ) : (
                          <Text className="text-sm">{bucket.icon}</Text>
                        )}
                        <Text className="text-sm text-fg">{bucket.name}</Text>
                      </View>
                      <Text className="font-data text-xs tabular-nums text-fg-muted">
                        {formatMoney(bucket.totalMinor, baseCurrency)}
                      </Text>
                    </View>
                    <View className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
                      <View
                        className={`h-full rounded-full ${kind === "expense" ? "bg-danger" : "bg-success"}`}
                        style={{ width: `${Math.min(fraction, 1) * 100}%` }}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          )}
          <Link href="/categories" asChild>
            <Pressable className="mt-3">
              <Text className="text-xs font-medium text-accent">Manage categories & budgets →</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </View>
  );
}
