import { useEffect, useMemo, useState } from "react";
import { Link } from "expo-router";
import { FlatList, Pressable, Text, View } from "react-native";

import { EmptyState } from "../../components/ui/EmptyState";
import { db } from "../../db/client";
import { useAccounts } from "../../db/queries/accounts";
import { useGoals } from "../../db/queries/goals";
import { useSettings } from "../../db/queries/settings";
import { getNetWorthSeries } from "../../services/balance";
import { getRatesToBase } from "../../services/currency";
import { formatMoney, majorToMinor, minorToMajor } from "../../services/format";

// Six months back is enough signal for a trailing growth rate without
// over-weighting a single unusual month — matches the real app's Goals page.
const TRAILING_MONTHS = 6;

export default function GoalsListScreen() {
  const { settings } = useSettings();
  const baseCurrency = settings?.baseCurrency ?? "INR";
  const { data: goals } = useGoals();
  const { data: accounts } = useAccounts();

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

  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);
  const sixMonthsAgo = useMemo(
    () => new Date(today.getFullYear(), today.getMonth() - TRAILING_MONTHS, today.getDate()),
    [today],
  );

  const [netWorthPast, netWorthNow] = accounts
    ? getNetWorthSeries(
        db,
        accounts.map((a) => ({ id: a.id, currency: a.currency })),
        [sixMonthsAgo, today],
        toBaseMinor,
      )
    : [0, 0];
  const monthlyGrowth = (netWorthNow - netWorthPast) / TRAILING_MONTHS;

  const rows = (goals ?? []).map((goal) => {
    const target = goal.targetAmountMinor;
    const remaining = target - netWorthNow;
    const percent = Math.min(100, Math.max(0, (netWorthNow / target) * 100));
    const reached = netWorthNow >= target;

    let projectedDate: Date | null = null;
    if (!reached && monthlyGrowth > 0) {
      const monthsToGoal = Math.ceil(remaining / monthlyGrowth);
      projectedDate = new Date(today.getFullYear(), today.getMonth() + monthsToGoal, today.getDate());
    }
    const isBehindTarget =
      goal.targetDate !== null && projectedDate !== null && projectedDate > goal.targetDate;

    return { goal, remaining, percent, reached, projectedDate, isBehindTarget };
  });

  return (
    <View className="flex-1 bg-bg">
      <FlatList
        data={rows}
        keyExtractor={({ goal }) => String(goal.id)}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        ListHeaderComponent={
          <Text className="mb-4 text-sm text-fg-muted">
            Tracked against net worth. Projected dates use your trailing {TRAILING_MONTHS}-month
            growth rate ({formatMoney(monthlyGrowth, baseCurrency)}/mo).
          </Text>
        }
        ListEmptyComponent={
          <EmptyState message="No goals yet. Set a net worth target to start tracking progress." />
        }
        renderItem={({ item: { goal, remaining, percent, reached, projectedDate, isBehindTarget } }) => (
          <View className="rounded-card border border-glass-border bg-glass p-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-medium text-fg">{goal.name}</Text>
              <Text className="font-data text-sm font-medium tabular-nums text-fg">
                {formatMoney(goal.targetAmountMinor, baseCurrency)}
              </Text>
            </View>

            <View className="mt-2 h-2 overflow-hidden rounded-full bg-surface-3">
              <View
                className={`h-full rounded-full ${reached ? "bg-success" : "bg-accent"}`}
                style={{ width: `${percent}%` }}
              />
            </View>

            <View className="mt-2 flex-row items-center justify-between">
              <Text className="text-xs text-fg-muted">{percent.toFixed(0)}% there</Text>
              {reached ? (
                <Text className="text-xs font-medium text-success">🎉 Goal reached</Text>
              ) : (
                <Text className="text-xs text-fg-muted">
                  {formatMoney(remaining, baseCurrency)} to go
                </Text>
              )}
            </View>

            {!reached && (
              <Text className="mt-1 text-xs text-fg-muted">
                {projectedDate
                  ? `At current pace, projected around ${projectedDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}`
                  : "Not currently trending toward this goal"}
                {goal.targetDate
                  ? ` · target ${goal.targetDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}`
                  : ""}
              </Text>
            )}
            {isBehindTarget && (
              <Text className="mt-1 text-xs font-medium text-danger">
                Behind pace for your target date
              </Text>
            )}

            <Link href={`/goal/${goal.id}/edit`} asChild>
              <Pressable className="mt-3">
                <Text className="text-xs font-medium text-accent">Edit</Text>
              </Pressable>
            </Link>
          </View>
        )}
      />

      <Link href="/goal/new" asChild>
        <Pressable className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-accent">
          <Text className="text-2xl text-white">+</Text>
        </Pressable>
      </Link>
    </View>
  );
}
