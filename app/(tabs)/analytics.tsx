import { useMemo, useState } from "react";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Link } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";

import { CumulativeSpendChart } from "../../components/charts/CumulativeSpendChart";
import { NetWorthTrendChart } from "../../components/charts/NetWorthTrendChart";
import { FirstVisitHint } from "../../components/FirstVisitHint";
import { HeaderAction, ScreenHeader } from "../../components/ScreenHeader";
import { DateField } from "../../components/TransactionFilterSheet";
import { UnconvertedCurrenciesNote } from "../../components/UnconvertedCurrenciesNote";
import { Icon } from "../../components/ui/Icon";
import { db } from "../../db/client";
import { useCategories } from "../../db/queries/categories";
import { useSettings } from "../../db/queries/settings";
import { useFilteredTransactions } from "../../db/queries/transactions";
import { useMonthPosition } from "../../hooks/useMonthPosition";
import { useNetWorthHidden } from "../../hooks/useNetWorthHidden";
import { getEarliestTransactionDate, getNetWorthSeries, getPeriodTotals } from "../../services/balance";
import { addToBucket, sortedBuckets, type Bucket } from "../../services/breakdown";
import { cumulativeDailySpend, cumulativeRangeSpend } from "../../services/cumulativeSpend";
import { formatMoney } from "../../services/format";
import {
  currentMonthPeriod,
  customRanges,
  monthLabel,
  monthRange,
  monthShortLabel,
  monthsBetween,
  shiftMonth,
  type MonthPeriod,
} from "../../services/period";
import { useThemeColors } from "../../theme/palette";
import { TAB_BAR_CLEARANCE } from "../../theme/tabBar";
import type { CategoryKind } from "../../db/schema";

const TREND_MONTHS_CAP = 24;
const TOP_CATEGORIES = 5;

const monthName = ({ year, month }: MonthPeriod) =>
  new Date(year, month, 1).toLocaleDateString(undefined, { month: "long" });

// Analytics V4 (spec.md §5.24): insight first, detail on request. Three
// questions in order — how is spending going (a one-line comparison, then
// the chart that explains it), where did the money go (top categories,
// "Show all" for the rest), and how is net worth moving. Asset allocation
// moved to the Net worth screen. Every figure is the same calculation V2
// Analytics used; the headline comparison is the Dashboard's like-for-like
// one from useMonthPosition.
//
// Custom range: a From/To (inclusive, up to today) in place of the month.
// Same calculations over the picked range — spending from getPeriodTotals,
// net worth and its change from balances at the range's start and end —
// compared with the equally long stretch just before it.
export default function AnalyticsScreen() {
  const colors = useThemeColors();
  const [period, setPeriod] = useState(currentMonthPeriod());
  const [custom, setCustom] = useState<{ from: Date; to: Date } | null>(null);
  const [picker, setPicker] = useState<"from" | "to" | null>(null);
  const [kind, setKind] = useState<CategoryKind>("expense");
  const [showAllCategories, setShowAllCategories] = useState(false);
  const ranges = useMemo(() => (custom ? customRanges(custom.from, custom.to) : null), [custom]);
  const range = useMemo(() => (ranges ? ranges.current : monthRange(period)), [ranges, period]);

  const { settings } = useSettings();
  const baseCurrency = settings?.baseCurrency ?? "INR";
  const { data: categories } = useCategories();
  const { data: monthTransactions } = useFilteredTransactions({ range });
  // Last month's rows for the cumulative-spend comparison (spec.md §5.22).
  const lastPeriod = useMemo(() => shiftMonth(period, -1), [period]);
  const lastRange = useMemo(() => (ranges ? ranges.previous : monthRange(lastPeriod)), [ranges, lastPeriod]);
  const { data: lastMonthTransactions } = useFilteredTransactions({ range: lastRange });

  const {
    accounts,
    toBaseMinor,
    unconvertedCurrencies,
    netWorthMinor,
    netWorthChangeMinor,
    expenseMinor,
    comparisonDays,
    expenseToDateMinor,
    lastMonthSameDaysExpenseMinor,
  } = useMonthPosition(period);

  // Same session privacy mask as the Dashboard's net worth.
  const netWorthHidden = useNetWorthHidden();

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
    // categoryInfo closes over `categories`, and baseCurrency only reaches
    // this through toBaseMinor — both already listed, so the missing-deps
    // warning here is transitively satisfied.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthTransactions, accounts, categories, kind, toBaseMinor]);
  const categoryTotal = byCategory.reduce((sum, b) => sum + b.totalMinor, 0);
  const shownCategories = showAllCategories ? byCategory : byCategory.slice(0, TOP_CATEGORIES);

  const accountCurrencies = (accounts ?? []).map((a) => ({ id: a.id, currency: a.currency }));
  const thisMonthSpend = ranges
    ? cumulativeRangeSpend(monthTransactions ?? [], accountCurrencies, toBaseMinor, { ...range, fallbackCurrency: baseCurrency })
    : cumulativeDailySpend(monthTransactions ?? [], accountCurrencies, toBaseMinor, { ...period, fallbackCurrency: baseCurrency });
  const lastMonthSpend = ranges
    ? cumulativeRangeSpend(lastMonthTransactions ?? [], accountCurrencies, toBaseMinor, { ...lastRange, fallbackCurrency: baseCurrency })
    : cumulativeDailySpend(lastMonthTransactions ?? [], accountCurrencies, toBaseMinor, { ...lastPeriod, fallbackCurrency: baseCurrency });

  // Custom-range figures. useMonthPosition's month figures, composed the
  // same way over the picked range: carry forward there is net worth at the
  // range's start, so the change is end − start. monthTransactions is the
  // change signal, as for the trend below.
  const customFigures = useMemo(() => {
    if (!ranges || !accounts) return null;
    let expense = 0;
    let previousExpense = 0;
    for (const a of accounts) {
      expense += toBaseMinor(getPeriodTotals(db, { accountId: a.id, ...ranges.current }).expenseMinor, a.currency);
      previousExpense += toBaseMinor(getPeriodTotals(db, { accountId: a.id, ...ranges.previous }).expenseMinor, a.currency);
    }
    const [atStart, atEnd] = getNetWorthSeries(
      db,
      accounts.map((a) => ({ id: a.id, currency: a.currency })),
      [ranges.current.start, ranges.current.end],
      toBaseMinor,
    );
    return { expense, previousExpense, netWorth: atEnd, netWorthChange: atEnd - atStart };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- monthTransactions is the change signal
  }, [ranges, accounts, toBaseMinor, monthTransactions]);

  const now = new Date();
  const viewingCurrentMonth = !ranges && period.year === now.getFullYear() && period.month === now.getMonth();
  // A month that hasn't started holds only recurring rows already booked
  // ahead (ensureMaterialized). Nothing has been spent yet, so it is shown
  // as "scheduled" and gets no pace chart — drawing those rows as a full
  // month of spending read as if it had already happened.
  const viewingFutureMonth = !ranges && period.year * 12 + period.month > now.getFullYear() * 12 + now.getMonth();

  // Up to 24 months × every account of synchronous balance reads — the
  // heaviest thing on this screen, so it re-runs only when transactions
  // (monthTransactions re-emits on any change to the table), accounts,
  // rates or the month do. Performance, spec.md §5.24.
  // The trend runs up to the month being viewed — for a custom range, the
  // month its To falls in.
  const trendEnd: MonthPeriod = useMemo(
    () => (custom ? { year: custom.to.getFullYear(), month: custom.to.getMonth() } : period),
    [custom, period],
  );
  const { trendLength, trendMonths, trendData } = useMemo(() => {
    const earliestTransactionDate = getEarliestTransactionDate(db);
    const earliestPeriod: MonthPeriod = earliestTransactionDate
      ? { year: earliestTransactionDate.getFullYear(), month: earliestTransactionDate.getMonth() }
      : trendEnd;
    const trendLength = Math.min(TREND_MONTHS_CAP, Math.max(1, monthsBetween(earliestPeriod, trendEnd) + 1));
    const trendMonths = Array.from({ length: trendLength }, (_, i) => shiftMonth(trendEnd, i - (trendLength - 1)));
    const trendCutoffs = trendMonths.map((mk) => monthRange(mk).end);
    const netWorthSeries = accounts
      ? getNetWorthSeries(db, accounts.map((a) => ({ id: a.id, currency: a.currency })), trendCutoffs, toBaseMinor)
      : [];
    const trendData = trendMonths.map((mk, i) => ({
      label: monthShortLabel(mk),
      valueMinor: netWorthSeries[i] ?? 0,
    }));
    return { trendLength, trendMonths, trendData };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- monthTransactions is the change signal
  }, [accounts, toBaseMinor, trendEnd, monthTransactions]);

  // The headline sentence: same like-for-like comparison as the Dashboard.
  const lastName = monthName(lastPeriod);
  const compared = customFigures ? customFigures.expense : expenseToDateMinor;
  const comparedWith = customFigures ? customFigures.previousExpense : lastMonthSameDaysExpenseMinor;
  const changePercent = comparedWith > 0 ? Math.round(((compared - comparedWith) / comparedWith) * 100) : null;
  const daysBefore = ranges ? (ranges.days === 1 ? "day before" : `${ranges.days} days before`) : null;
  const span = daysBefore
    ? `the ${daysBefore}`
    : viewingCurrentMonth
      ? `the first ${comparisonDays} days of ${lastName}`
      : lastName;
  const shownExpenseMinor = customFigures?.expense ?? expenseMinor;
  const shownNetWorthMinor = customFigures?.netWorth ?? netWorthMinor;
  const shownNetWorthChangeMinor = customFigures?.netWorthChange ?? netWorthChangeMinor;

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const openCustomRange = () => {
    // Start from the month being viewed, never past today.
    const { start } = monthRange(period);
    const monthEnd = new Date(period.year, period.month + 1, 0);
    const to = monthEnd < startOfToday ? monthEnd : startOfToday;
    setCustom({ from: start < to ? start : to, to });
  };
  const spendingInsight =
    changePercent === null
      ? `No spending recorded in ${span} to compare with.`
      : changePercent === 0
        ? `About the same as ${span}.`
        : `${Math.abs(changePercent)}% ${changePercent > 0 ? "more" : "less"} than ${span}.`;

  const topCategory = kind === "expense" && byCategory.length > 0 && categoryTotal > 0 ? byCategory[0] : null;

  return (
    <View className="flex-1 bg-bg">
      <ScreenHeader title="Analytics">
        <HeaderAction
          icon="calendar-range"
          label={custom ? "Back to months" : "Custom date range"}
          active={!!custom}
          onPress={() => (custom ? setCustom(null) : openCustomRange())}
        />
      </ScreenHeader>
      <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ padding: 20, paddingBottom: TAB_BAR_CLEARANCE }}>
        <FirstVisitHint id="analytics" className="mb-4" />
        {custom ? (
          <View className="flex-row items-center gap-2">
            <DateField label="From" value={custom.from} onPress={() => setPicker("from")} />
            <DateField label="To" value={custom.to} onPress={() => setPicker("to")} />
            <Pressable
              onPress={() => setCustom(null)}
              accessibilityRole="button"
              accessibilityLabel="Back to months"
              className="h-11 w-11 items-center justify-center"
            >
              <Icon name="close" size={20} color={colors.fgMuted} />
            </Pressable>
          </View>
        ) : (
        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={() => setPeriod((p) => shiftMonth(p, -1))}
            accessibilityRole="button"
            accessibilityLabel="Previous month"
            className="h-11 w-11 items-center justify-center"
          >
            <Icon name="chevron-left" size={24} color={colors.fg} />
          </Pressable>
          <Text accessibilityRole="header" className="text-base font-medium text-fg">
            {monthLabel(period)}
          </Text>
          <Pressable
            onPress={() => setPeriod((p) => shiftMonth(p, 1))}
            accessibilityRole="button"
            accessibilityLabel="Next month"
            className="h-11 w-11 items-center justify-center"
          >
            <Icon name="chevron-right" size={24} color={colors.fg} />
          </Pressable>
        </View>
        )}
        {custom && picker && (
          <DateTimePicker
            value={picker === "from" ? custom.from : custom.to}
            mode="date"
            maximumDate={startOfToday}
            onChange={(_, selected) => {
              const which = picker;
              setPicker(null);
              if (!selected) return;
              // Keep From ≤ To: moving one past the other drags it along.
              setCustom((c) =>
                !c
                  ? c
                  : which === "from"
                    ? { from: selected, to: selected > c.to ? selected : c.to }
                    : { from: selected < c.from ? selected : c.from, to: selected },
              );
            }}
          />
        )}

        {/* 1 — How is spending going? */}
        <View className="mt-4">
          <Text className="text-sm text-fg-muted">{viewingFutureMonth ? "Scheduled" : "Spending"}</Text>
          <Text className="font-data text-3xl font-bold tabular-nums text-fg">
            {formatMoney(shownExpenseMinor, baseCurrency)}
          </Text>
          <Text className="mt-1 text-sm text-fg">
            {viewingFutureMonth
              ? `${monthName(period)} hasn't started yet. This is what's already booked — your recurring payments.`
              : viewingCurrentMonth && changePercent !== null
              ? `So far, ${spendingInsight.charAt(0).toLowerCase()}${spendingInsight.slice(1)}`
              : spendingInsight}
          </Text>
          {!viewingFutureMonth && (
          <View className="mt-4">
            <CumulativeSpendChart
              thisMonth={thisMonthSpend}
              lastMonth={lastMonthSpend}
              currency={baseCurrency}
              today={viewingCurrentMonth ? now.getDate() : undefined}
              currentLabel={ranges ? "This period" : undefined}
              previousLabel={daysBefore ? `The ${daysBefore}` : undefined}
            />
          </View>
          )}
          <UnconvertedCurrenciesNote currencies={unconvertedCurrencies} subject="Spending" />
        </View>

        <View className="my-6 h-px bg-border" />

        {/* 2 — Where did my money go? */}
        <View>
          <View className="mb-1 flex-row items-center justify-between">
            <Text accessibilityRole="header" className="font-display text-base text-fg">
              {viewingFutureMonth
                ? kind === "expense" ? "Scheduled spending" : "Scheduled income"
                : kind === "expense" ? "Where your money went" : "Where your money came from"}
            </Text>
            <Pressable
              onPress={() => {
                setKind((k) => (k === "expense" ? "income" : "expense"));
                setShowAllCategories(false);
              }}
              accessibilityRole="button"
              hitSlop={12}
            >
              <Text className="text-sm font-medium text-accent">{kind === "expense" ? "Show income" : "Show spending"}</Text>
            </Pressable>
          </View>
          {topCategory && (
            <Text className="mb-3 text-sm text-fg-muted">
              {topCategory.name} was {Math.round((topCategory.totalMinor / categoryTotal) * 100)}% of it.
            </Text>
          )}
          {byCategory.length === 0 ? (
            <Text className="mt-2 text-sm text-fg-muted">Nothing recorded {ranges ? "in this period" : "this month"}.</Text>
          ) : (
            <View className="mt-2 gap-3">
              {shownCategories.map((bucket) => {
                const fraction = categoryTotal > 0 ? bucket.totalMinor / categoryTotal : 0;
                return (
                  <View key={bucket.key}>
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1 flex-row items-center gap-2">
                        {bucket.iconType === "mdi" ? (
                          <Icon name={bucket.icon} size={16} color={colors.fgMuted} />
                        ) : (
                          <Text className="text-sm">{bucket.icon}</Text>
                        )}
                        <Text className="text-sm text-fg" numberOfLines={1}>
                          {bucket.name}
                        </Text>
                      </View>
                      <Text className="font-data text-sm tabular-nums text-fg">
                        {formatMoney(bucket.totalMinor, baseCurrency)}
                      </Text>
                    </View>
                    <View className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-3">
                      <View
                        className={`h-full rounded-full ${kind === "expense" ? "bg-accent-fill" : "bg-success"}`}
                        style={{ width: `${Math.min(fraction, 1) * 100}%` }}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          )}
          <View className="mt-4 flex-row items-center justify-between">
            {byCategory.length > TOP_CATEGORIES ? (
              <Pressable onPress={() => setShowAllCategories((s) => !s)} accessibilityRole="button" hitSlop={12}>
                <Text className="text-sm font-medium text-accent">
                  {showAllCategories ? "Show top 5" : `Show all ${byCategory.length}`}
                </Text>
              </Pressable>
            ) : (
              <View />
            )}
            <Link href="/categories" asChild>
              <Pressable accessibilityRole="link" hitSlop={12}>
                <Text className="text-sm font-medium text-accent">Categories & budgets</Text>
              </Pressable>
            </Link>
          </View>
        </View>

        <View className="my-6 h-px bg-border" />

        {/* 3 — How is my net worth moving? */}
        <Link href="/net-worth" asChild>
          <Pressable accessibilityRole="button" accessibilityHint="Opens net worth details">
            <View className="flex-row items-center justify-between">
              <Text className="font-display text-base text-fg">Net worth</Text>
              <Text className="text-xs text-fg-subtle">
                {trendLength >= TREND_MONTHS_CAP ? `Last ${TREND_MONTHS_CAP} months` : `Since ${monthShortLabel(trendMonths[0])}`}
              </Text>
            </View>
            <Text className="font-data mt-1 text-2xl font-bold tabular-nums text-fg">
              {netWorthHidden ? "••••••" : formatMoney(shownNetWorthMinor, baseCurrency)}
            </Text>
            {!netWorthHidden && shownNetWorthChangeMinor !== 0 && (
              <Text className={`text-sm font-medium ${shownNetWorthChangeMinor > 0 ? "text-success" : "text-danger"}`}>
                {shownNetWorthChangeMinor > 0 ? "↑" : "↓"} {formatMoney(Math.abs(shownNetWorthChangeMinor), baseCurrency)}{" "}
                {ranges ? "over this period" : `in ${monthName(period)}`}
              </Text>
            )}
          </Pressable>
        </Link>
        {/* The trend's axis labels are amounts too, so it follows the same
            session privacy mask as the figure above. */}
        {!netWorthHidden && <UnconvertedCurrenciesNote currencies={unconvertedCurrencies} subject="Net worth" />}
        {netWorthHidden ? (
          <Text className="mt-3 text-sm text-fg-muted">Hidden — tap the eye on the Dashboard to show amounts.</Text>
        ) : (
          <View className="mt-4">
            <NetWorthTrendChart data={trendData} currency={baseCurrency} height={180} />
          </View>
        )}
      </ScrollView>
    </View>
  );
}
