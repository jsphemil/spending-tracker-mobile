import { useEffect, useMemo, useState } from "react";
import { Link } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Icon } from "../../components/ui/Icon";

import { AssetAllocationChart } from "../../components/charts/AssetAllocationChart";
import { NetWorthTrendChart } from "../../components/charts/NetWorthTrendChart";
import { CalendarMonthGrid } from "../../components/CalendarMonthGrid";
import { confirmDeleteTransaction } from "../../components/confirmDeleteTransaction";
import { CurrencyAmount } from "../../components/CurrencyAmount";
import { GaugeRing } from "../../components/rings/GaugeRing";
import { TransactionListItem } from "../../components/TransactionListItem";
import { EmptyState } from "../../components/ui/EmptyState";
import { ACCOUNT_TYPE_LABELS } from "../../constants/accountTypes";
import { db } from "../../db/client";
import { useAccounts } from "../../db/queries/accounts";
import { useCategories } from "../../db/queries/categories";
import { useGoals } from "../../db/queries/goals";
import { useSettings } from "../../db/queries/settings";
import { useRecentTagNames } from "../../db/queries/tags";
import { useFilteredTransactions } from "../../db/queries/transactions";
import { getAccountBalanceMinor, getEarliestTransactionDate, getNetWorthSeries, getPeriodTotals } from "../../services/balance";
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
import { useThemeColors } from "../../theme/palette";

const ASSET_ALLOCATION_BUCKETS = [
  { name: "Liquid (Savings/Wallet)", types: ["savings", "wallet"], color: "#7c6ef2" },
  { name: "Deposits (FD/RD)", types: ["deposit"], color: "#f0a63a" },
  { name: "Invested", types: ["investment"], color: "#3aa0c9" },
] as const;

export default function DashboardScreen() {
  const colors = useThemeColors();
  const [period, setPeriod] = useState(currentMonthPeriod());
  const range = useMemo(() => monthRange(period), [period]);
  useEffect(() => {
    ensureMaterialized(db, { through: range.end });
  }, [range.end]);

  const { settings } = useSettings();
  const baseCurrency = settings?.baseCurrency ?? "INR";
  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();
  const { data: goals } = useGoals();
  const recentTagNames = useRecentTagNames(8);
  const { data: monthTransactions } = useFilteredTransactions({ range });
  // "Recent transactions" is the 5 most recent up to the viewed period's
  // end — not scoped to its start too — so a month with under 5 rows still
  // fills in with the tail of the previous month, matching the real app.
  const { data: recentTransactionsRaw } = useFilteredTransactions({
    range: { start: new Date(2000, 0, 1), end: range.end },
  });

  // Spec 5.6: same declutter-only semantics as Account Detail and the
  // Transactions list — hides future-dated rows/day-cells, never touches
  // totals, only while genuinely viewing the current month. Dashboard is
  // never scoped to one account, so there's no per-account override to
  // resolve — just the global setting.
  const now = new Date();
  const todayDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const isCurrentMonth = now.getFullYear() === period.year && now.getMonth() === period.month;
  const hidingFuture = isCurrentMonth && !(settings?.showFutureTxGlobal ?? true);
  const visibleMonthTransactions = hidingFuture
    ? (monthTransactions ?? []).filter((t) => t.date <= todayDateOnly)
    : (monthTransactions ?? []);
  const recentTransactionsAll = hidingFuture
    ? (recentTransactionsRaw ?? []).filter((t) => t.date <= todayDateOnly)
    : (recentTransactionsRaw ?? []);
  const recentTransactions = recentTransactionsAll.slice(0, 5);
  const hiddenFutureCount = (recentTransactionsRaw ?? []).length - recentTransactionsAll.length;

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

  // Every aggregate below is "as of the viewed month's end" (range.end),
  // not always today — so paging the month nav moves everything together,
  // matching the real app's deltasAtEnd/deltasAtStart pattern.
  const accountBalanceAtEnd = new Map(
    (accounts ?? []).map((a) => [a.id, getAccountBalanceMinor(db, a.id, range.end)]),
  );
  const accountBalanceAtStart = new Map(
    (accounts ?? []).map((a) => [a.id, getAccountBalanceMinor(db, a.id, range.start)]),
  );

  let netWorthMinor = 0;
  let carryForwardMinor = 0;
  let creditCardDebtMinor = 0;
  let incomeMinor = 0;
  let expenseMinor = 0;
  for (const account of accounts ?? []) {
    const baseBalance = toBaseMinor(accountBalanceAtEnd.get(account.id) ?? 0, account.currency);
    netWorthMinor += baseBalance;
    if (account.type === "credit_card" && baseBalance < 0) {
      creditCardDebtMinor += -baseBalance;
    }
    carryForwardMinor += toBaseMinor(accountBalanceAtStart.get(account.id) ?? 0, account.currency);

    const totals = getPeriodTotals(db, { accountId: account.id, ...range });
    incomeMinor += toBaseMinor(totals.incomeMinor, account.currency);
    expenseMinor += toBaseMinor(totals.expenseMinor, account.currency);
  }

  // A gauge, not a flow-ratio pie: capacity is what the portfolio had
  // available this period (carry forward + income, transfers excluded
  // since they cancel out across accounts), Used eats into it, Available
  // is what's left — which is exactly Net Worth.
  const totalAvailable = carryForwardMinor + incomeMinor;
  const usedFraction = totalAvailable > 0 ? expenseMinor / totalAvailable : null;
  const percentUsed = usedFraction !== null ? usedFraction * 100 : null;

  // Composition of positive balances by liquidity — Credit Card balances
  // are debt, not an asset, so excluded here and shown as their own figure.
  const assetAllocation = ASSET_ALLOCATION_BUCKETS.map((bucket) => ({
    name: bucket.name,
    color: bucket.color,
    valueMinor: (accounts ?? [])
      .filter((a) => (bucket.types as readonly string[]).includes(a.type))
      .reduce(
        (sum, a) => sum + Math.max(0, toBaseMinor(accountBalanceAtEnd.get(a.id) ?? 0, a.currency)),
        0,
      ),
  })).filter((b) => b.valueMinor > 0);

  // Net worth trend, capped to the account's actual history rather than a
  // flat 12 months — a brand-new profile shows just the 1 real point it has.
  const earliestTransactionDate = getEarliestTransactionDate(db);
  const earliestPeriod: MonthPeriod = earliestTransactionDate
    ? { year: earliestTransactionDate.getFullYear(), month: earliestTransactionDate.getMonth() }
    : period;
  const trendLength = Math.min(12, Math.max(1, monthsBetween(earliestPeriod, period) + 1));
  const trendMonths = Array.from({ length: trendLength }, (_, i) => shiftMonth(period, i - (trendLength - 1)));
  const trendCutoffs = trendMonths.map((mk) => monthRange(mk).end);
  const netWorthSeries = accounts
    ? getNetWorthSeries(db, accounts.map((a) => ({ id: a.id, currency: a.currency })), trendCutoffs, toBaseMinor)
    : [];
  const trendData = trendMonths.map((mk, i) => ({
    label: monthShortLabel(mk),
    valueMinor: netWorthSeries[i] ?? 0,
  }));

  // Over-budget categories this month — reuses the month's own transactions
  // rather than a separate query, same spend calc as the Categories screen.
  const spendByCategory = new Map<number, number>();
  for (const t of monthTransactions ?? []) {
    if (t.type !== "expense" || t.categoryId === null) continue;
    const acctCurrency = accounts?.find((a) => a.id === t.accountId)?.currency ?? baseCurrency;
    spendByCategory.set(
      t.categoryId,
      (spendByCategory.get(t.categoryId) ?? 0) + toBaseMinor(t.amountMinor, acctCurrency),
    );
  }
  const overBudgetCategories = (categories ?? [])
    .filter((c) => c.kind === "expense" && c.monthlyBudgetMinor != null)
    .map((c) => ({ ...c, spentMinor: spendByCategory.get(c.id) ?? 0 }))
    .filter((c) => c.spentMinor > c.monthlyBudgetMinor!);

  const expenseByDay: Record<number, number> = {};
  for (const t of visibleMonthTransactions) {
    if (t.type !== "expense") continue;
    const acctCurrency = accounts?.find((a) => a.id === t.accountId)?.currency ?? baseCurrency;
    const day = t.date.getDate();
    expenseByDay[day] = (expenseByDay[day] ?? 0) + toBaseMinor(t.amountMinor, acctCurrency);
  }

  const topGoals = (goals ?? []).slice(0, 3).map((goal) => ({
    goal,
    percent: Math.min(100, Math.max(0, (netWorthMinor / goal.targetAmountMinor) * 100)),
  }));

  const categoryName = (id: number | null) => categories?.find((c) => c.id === id)?.name;
  const accountName = (id: number | null) => accounts?.find((a) => a.id === id)?.name;

  const card = "rounded-card border border-glass-border bg-glass p-4";
  const cardTitle = "mb-3 text-sm font-semibold text-fg";

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ padding: 16, gap: 12 }}>
      <View className="flex-row items-center justify-between">
        <Pressable onPress={() => setPeriod((p) => shiftMonth(p, -1))} className="p-3" hitSlop={8}>
          <Icon name="chevron-left" size={28} color={colors.fg} />
        </Pressable>
        <Text className="text-base font-medium text-fg">{monthLabel(period)}</Text>
        <Pressable onPress={() => setPeriod((p) => shiftMonth(p, 1))} className="p-3" hitSlop={8}>
          <Icon name="chevron-right" size={28} color={colors.fg} />
        </Pressable>
      </View>

      {overBudgetCategories.length > 0 && (
        <View className="gap-1 rounded-card border border-danger/30 bg-danger-soft px-4 py-3">
          {overBudgetCategories.map((c) => (
            <Text key={c.id} className="text-xs font-medium text-danger">
              {c.name} is {formatMoney(c.spentMinor - c.monthlyBudgetMinor!, baseCurrency)} over
              its {formatMoney(c.monthlyBudgetMinor!, baseCurrency)}/mo budget
            </Text>
          ))}
          <Link href="/categories" asChild>
            <Pressable>
              <Text className="text-xs font-medium text-danger">Review budgets →</Text>
            </Pressable>
          </Link>
        </View>
      )}

      <View className={card}>
        <Text className="mb-3 text-xs font-semibold uppercase tracking-wide text-fg-muted">
          Net worth
        </Text>
        <GaugeRing
          usedFraction={usedFraction}
          centerLabel={monthLabel(period)}
          centerValue={formatMoney(netWorthMinor, baseCurrency)}
          centerSubtext={percentUsed !== null ? `${percentUsed.toFixed(0)}% of available used` : undefined}
        />
        {netWorthMinor < 0 && (
          <Text className="mt-3 text-center text-xs font-medium text-danger">
            Overdrawn by {formatMoney(Math.abs(netWorthMinor), baseCurrency)}
          </Text>
        )}
      </View>

      <View className={card}>
        <View className="mb-1 flex-row items-center justify-between">
          <Text className={cardTitle}>Net worth trend</Text>
          <Text className="text-[10px] font-medium uppercase tracking-wide text-fg-subtle">
            {trendLength >= 12 ? "Last 12 months" : `Since ${monthShortLabel(trendMonths[0])}`}
          </Text>
        </View>
        <NetWorthTrendChart data={trendData} currency={baseCurrency} height={160} />
      </View>

      <View className="flex-row flex-wrap gap-3">
        <View className="min-w-[45%] flex-1 rounded-card bg-surface-2 p-3.5">
          <Text className="text-[11px] text-fg-muted">Carry forward</Text>
          <Text className="font-data mt-1.5 text-base font-semibold tabular-nums text-fg">
            {formatMoney(carryForwardMinor, baseCurrency)}
          </Text>
        </View>
        <View className="min-w-[45%] flex-1 rounded-card bg-surface-2 p-3.5">
          <Text className="text-[11px] text-fg-muted">Income</Text>
          <Text className="font-data mt-1.5 text-base font-semibold tabular-nums text-success">
            +{formatMoney(incomeMinor, baseCurrency)}
          </Text>
        </View>
        <View className="min-w-[45%] flex-1 rounded-card bg-surface-2 p-3.5">
          <Text className="text-[11px] text-fg-muted">Expense</Text>
          <Text className="font-data mt-1.5 text-base font-semibold tabular-nums text-danger">
            −{formatMoney(expenseMinor, baseCurrency)}
          </Text>
        </View>
        <View className="min-w-[45%] flex-1 rounded-card bg-surface-2 p-3.5">
          <Text className="text-[11px] text-fg-muted">Credit card debt</Text>
          <Text className="font-data mt-1.5 text-base font-semibold tabular-nums text-fg">
            {creditCardDebtMinor > 0 ? formatMoney(creditCardDebtMinor, baseCurrency) : "—"}
          </Text>
        </View>
      </View>

      <View className={card}>
        <Text className={cardTitle}>Asset allocation</Text>
        {assetAllocation.length > 0 ? (
          <>
            <AssetAllocationChart data={assetAllocation} currency={baseCurrency} />
            {creditCardDebtMinor > 0 && (
              <Text className="mt-3 text-center text-xs text-fg-muted">
                Not included above —{" "}
                <Text className="font-medium text-danger">
                  Credit card debt: {formatMoney(creditCardDebtMinor, baseCurrency)}
                </Text>
              </Text>
            )}
          </>
        ) : (
          <Text className="text-sm text-fg-muted">No positive balances yet.</Text>
        )}
      </View>

      <View className={card}>
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-sm font-semibold text-fg">Goals</Text>
          <Link href="/goal" asChild>
            <Pressable>
              <Text className="text-xs font-medium text-accent">
                {(goals ?? []).length === 0 ? "Set a goal" : "View all"}
              </Text>
            </Pressable>
          </Link>
        </View>
        {(goals ?? []).length === 0 ? (
          <View>
            <Text className="text-sm text-fg-muted">
              No goals yet — set a net worth target to track progress here.
            </Text>
            <Link href="/goal/new" asChild>
              <Pressable className="mt-2">
                <Text className="text-xs font-medium text-accent">Create your first goal →</Text>
              </Pressable>
            </Link>
          </View>
        ) : (
          <View className="gap-3">
            {topGoals.map(({ goal, percent }) => (
              <View key={goal.id}>
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm font-medium text-fg">{goal.name}</Text>
                  <Text className="font-data text-sm tabular-nums text-fg-muted">
                    {percent.toFixed(0)}%
                  </Text>
                </View>
                <View className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-3">
                  <View
                    className={`h-full rounded-full ${percent >= 100 ? "bg-success" : "bg-accent"}`}
                    style={{ width: `${percent}%` }}
                  />
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      <View className={card}>
        <View className="mb-3 flex-row items-center justify-between">
          <Text className={cardTitle}>{monthLabel(period)}</Text>
        </View>
        <View className="mb-3 flex-row gap-2">
          <Link href="/transaction/new?type=income" asChild>
            <Pressable className="flex-1 items-center rounded-lg border border-glass-border py-1.5">
              <Text className="text-xs font-medium text-fg">+ Income</Text>
            </Pressable>
          </Link>
          <Link href="/transaction/new?type=expense" asChild>
            <Pressable className="flex-1 items-center rounded-lg border border-glass-border py-1.5">
              <Text className="text-xs font-medium text-fg">+ Expense</Text>
            </Pressable>
          </Link>
          <Link href="/transaction/new?type=transfer" asChild>
            <Pressable className="flex-1 items-center rounded-lg border border-glass-border py-1.5">
              <Text className="text-xs font-medium text-fg">+ Transfer</Text>
            </Pressable>
          </Link>
        </View>
        <CalendarMonthGrid period={period} currency={baseCurrency} expenseByDay={expenseByDay} />
      </View>

      <View className={card}>
        <View className="mb-3 flex-row items-center justify-between">
          <Text className={cardTitle}>Accounts</Text>
          <Link href="/accounts" asChild>
            <Pressable>
              <Text className="text-xs font-medium text-accent">View all</Text>
            </Pressable>
          </Link>
        </View>
        {(accounts ?? []).length === 0 ? (
          <Text className="text-sm text-fg-muted">No accounts yet.</Text>
        ) : (
          <View className="gap-1">
            {(accounts ?? []).map((a) => (
              <Link key={a.id} href={`/accounts/${a.id}`} asChild>
                <Pressable className="flex-row items-center justify-between rounded-lg py-2">
                  <View className="flex-row items-center gap-3">
                    <View style={{ backgroundColor: a.color }} className="h-9 w-9 rounded-lg" />
                    <View>
                      <Text className="text-sm font-medium text-fg">{a.name}</Text>
                      <Text className="text-xs text-fg-muted">{ACCOUNT_TYPE_LABELS[a.type]}</Text>
                    </View>
                  </View>
                  <CurrencyAmount
                    amountMinor={accountBalanceAtEnd.get(a.id) ?? 0}
                    currency={a.currency}
                    className="text-sm font-medium text-fg"
                  />
                </Pressable>
              </Link>
            ))}
          </View>
        )}
      </View>

      <View className={card}>
        <View className="mb-3 flex-row items-center justify-between">
          <Text className={cardTitle}>Recent transactions</Text>
          <Link href="/transactions" asChild>
            <Pressable>
              <Text className="text-xs font-medium text-accent">View all</Text>
            </Pressable>
          </Link>
        </View>
        {hiddenFutureCount > 0 && (
          <Text className="mb-2 text-xs text-fg-muted">
            {hiddenFutureCount} upcoming transaction{hiddenFutureCount === 1 ? "" : "s"} hidden — Show
            Future Transactions is off.
          </Text>
        )}
        {recentTransactions.length === 0 ? (
          <EmptyState message="No transactions yet." />
        ) : (
          recentTransactions.map((item) => (
            <TransactionListItem
              key={item.id}
              transaction={item}
              currency={accounts?.find((a) => a.id === item.accountId)?.currency ?? baseCurrency}
              categoryName={categoryName(item.categoryId)}
              fromAccountName={item.type === "transfer" ? accountName(item.accountId) : undefined}
              toAccountName={item.type === "transfer" ? accountName(item.toAccountId) : undefined}
              showActionIcons
              onDelete={() => confirmDeleteTransaction(db, item, () => {})}
            />
          ))
        )}
      </View>

      <View className={card}>
        <View className="mb-3 flex-row items-center justify-between">
          <Text className={cardTitle}>Tags</Text>
          <Link href="/tag" asChild>
            <Pressable>
              <Text className="text-xs font-medium text-accent">
                {recentTagNames.length === 0 ? "" : "More"}
              </Text>
            </Pressable>
          </Link>
        </View>
        {recentTagNames.length === 0 ? (
          <Text className="text-sm text-fg-muted">
            No tags yet — add one from any transaction.
          </Text>
        ) : (
          <View className="flex-row flex-wrap gap-2">
            {recentTagNames.map((name) => (
              <Link key={name} href={`/tag/${encodeURIComponent(name)}`} asChild>
                <Pressable className="rounded-full bg-surface-2 px-3 py-1.5">
                  <Text className="text-sm text-fg-muted">{name}</Text>
                </Pressable>
              </Link>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
