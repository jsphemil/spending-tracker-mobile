import { useEffect, useMemo, useState } from "react";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Link, Stack } from "expo-router";
import { FlatList, Pressable, ScrollView, Text, View } from "react-native";
import { Icon } from "../../../components/ui/Icon";

import { confirmDeleteTransaction } from "../../../components/confirmDeleteTransaction";
import { SummaryBand } from "../../../components/SummaryBand";
import { TransactionListItem } from "../../../components/TransactionListItem";
import { EmptyState } from "../../../components/ui/EmptyState";
import { db } from "../../../db/client";
import { useAccounts } from "../../../db/queries/accounts";
import { useCategories } from "../../../db/queries/categories";
import { useSettings } from "../../../db/queries/settings";
import { useFilteredTransactions } from "../../../db/queries/transactions";
import { getRatesToBase } from "../../../services/currency";
import { majorToMinor, minorToMajor } from "../../../services/format";
import { currentMonthPeriod, monthLabel, monthRange, shiftMonth } from "../../../services/period";
import { ensureMaterialized } from "../../../services/recurrence";
import { resolveAccountSettings } from "../../../services/settings";
import { useThemeColors } from "../../../theme/palette";

type FilterMode = "month" | "custom" | "allTime";
type TypeFilter = "all" | "recurring" | "transfer";

export default function TransactionsListScreen() {
  const colors = useThemeColors();
  const { settings } = useSettings();
  const baseCurrency = settings?.baseCurrency ?? "INR";
  const [filterMode, setFilterMode] = useState<FilterMode>("month");
  const [period, setPeriod] = useState(currentMonthPeriod());
  const [customFrom, setCustomFrom] = useState(() => monthRange(currentMonthPeriod()).start);
  const [customTo, setCustomTo] = useState(() => new Date());
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [accountId, setAccountId] = useState<number | undefined>(undefined);
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();
  const monthRangeValue = useMemo(() => monthRange(period), [period]);
  // Custom range's `end` is exclusive everywhere else in the app (matches
  // range.end/asOfDate convention), so the picked "To" date needs +1 day to
  // actually include transactions dated on that day.
  const customRangeValue = useMemo(
    () => ({ start: customFrom, end: new Date(customTo.getFullYear(), customTo.getMonth(), customTo.getDate() + 1) }),
    [customFrom, customTo],
  );
  const range =
    filterMode === "allTime" ? undefined : filterMode === "custom" ? customRangeValue : monthRangeValue;
  useEffect(() => {
    ensureMaterialized(db, range ? { through: range.end } : undefined);
  }, [range?.end]);
  const { data: rows } = useFilteredTransactions({ accountId, categoryId, range });

  // Requested 2026-08-21: filter down to just recurring-generated rows or
  // just transfers, on top of the existing account/category filters —
  // applied here (client-side, over the already-fetched rows) rather than
  // in the query, matching how future-hiding is layered on below. Unlike
  // future-hiding this is a real filter, not a declutter toggle, so it
  // affects totals too, not just which rows are listed.
  const typeFilteredRows = (rows ?? []).filter((t) => {
    if (typeFilter === "recurring") return t.recurringRuleId != null;
    if (typeFilter === "transfer") return t.type === "transfer";
    return true;
  });

  // Spec 5.6: same declutter-only semantics as Account Detail — hides
  // future-dated *rows*, never touches totals, and only while genuinely
  // viewing the current month (a future/custom/all-time view has no
  // "haven't happened yet" concept to declutter). With one account
  // selected, its own override (if any) wins over the global setting; with
  // "All Accounts" there's no single account to resolve an override
  // against, so it's the global setting alone.
  const now = new Date();
  const todayDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const isCurrentMonth =
    filterMode === "month" && now.getFullYear() === period.year && now.getMonth() === period.month;
  const selectedAccount = accountId ? accounts?.find((a) => a.id === accountId) : undefined;
  const showFutureTxEnabled =
    selectedAccount && settings
      ? resolveAccountSettings(selectedAccount, settings).showFutureTxEnabled
      : settings?.showFutureTxGlobal ?? true;
  const hidingFuture = isCurrentMonth && !showFutureTxEnabled;
  const visibleRows = hidingFuture
    ? typeFilteredRows.filter((t) => t.date <= todayDateOnly)
    : typeFilteredRows;
  const hiddenFutureCount = typeFilteredRows.length - visibleRows.length;

  // When a single account is selected every row already shares that
  // account's currency, so the band shows it natively. Across "All
  // Accounts" the rows can mix currencies — everything gets converted to
  // the base currency before summing (matching the Dashboard's
  // toBaseMinor pattern) instead of adding raw minor units of different
  // currencies together.
  const currency = accountId
    ? accounts?.find((a) => a.id === accountId)?.currency ?? baseCurrency
    : baseCurrency;

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

  function toBaseMinor(amountMinor: number, txCurrency: string): number {
    if (txCurrency === baseCurrency) return amountMinor;
    const rate = rates[txCurrency];
    if (rate === undefined) return 0;
    return majorToMinor(minorToMajor(amountMinor, txCurrency) * rate, baseCurrency);
  }

  const totals = typeFilteredRows.reduce(
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
      <Stack.Screen
        options={{
          headerRight: () => (
            <Link href="/transactions/calendar" asChild>
              <Pressable hitSlop={8} className="px-2">
                <Icon name="calendar-month-outline" size={22} color={colors.accent} />
              </Pressable>
            </Link>
          ),
        }}
      />
      <View className="gap-3 border-b border-glass-border p-4">
        <View className="flex-row gap-1.5 rounded-lg bg-surface-2 p-1">
          {(
            [
              ["month", "This month"],
              ["custom", "Custom range"],
              ["allTime", "All time"],
            ] as const
          ).map(([mode, label]) => (
            <Pressable
              key={mode}
              onPress={() => setFilterMode(mode)}
              className={`flex-1 items-center rounded py-1.5 ${filterMode === mode ? "bg-glass" : ""}`}
              style={
                filterMode === mode
                  ? {
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.05,
                      shadowRadius: 2,
                      elevation: 1,
                    }
                  : undefined
              }
            >
              <Text className={`text-xs font-medium ${filterMode === mode ? "text-fg" : "text-fg-muted"}`}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        {filterMode === "month" && (
          <View className="flex-row items-center justify-between">
            <Pressable
              onPress={() => setPeriod((p) => shiftMonth(p, -1))}
              className="p-3"
              hitSlop={8}
            >
              <Icon name="chevron-left" size={28} color={colors.fg} />
            </Pressable>
            <Text className="text-base font-medium text-fg">{monthLabel(period)}</Text>
            <Pressable
              onPress={() => setPeriod((p) => shiftMonth(p, 1))}
              className="p-3"
              hitSlop={8}
            >
              <Icon name="chevron-right" size={28} color={colors.fg} />
            </Pressable>
          </View>
        )}

        {filterMode === "custom" && (
          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={() => setShowFromPicker(true)}
              className="flex-1 rounded-lg border border-glass-border bg-glass px-3 py-2"
            >
              <Text className="text-xs text-fg-muted">From</Text>
              <Text className="text-sm text-fg">{customFrom.toDateString()}</Text>
            </Pressable>
            <Pressable
              onPress={() => setShowToPicker(true)}
              className="flex-1 rounded-lg border border-glass-border bg-glass px-3 py-2"
            >
              <Text className="text-xs text-fg-muted">To</Text>
              <Text className="text-sm text-fg">{customTo.toDateString()}</Text>
            </Pressable>
            {showFromPicker && (
              <DateTimePicker
                value={customFrom}
                mode="date"
                onChange={(_, selected) => {
                  setShowFromPicker(false);
                  if (selected) setCustomFrom(selected);
                }}
              />
            )}
            {showToPicker && (
              <DateTimePicker
                value={customTo}
                mode="date"
                onChange={(_, selected) => {
                  setShowToPicker(false);
                  if (selected) setCustomTo(selected);
                }}
              />
            )}
          </View>
        )}

        {filterMode === "allTime" && (
          <Text className="text-center text-base font-medium text-fg">All time</Text>
        )}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
          <Pressable
            onPress={() => setAccountId(undefined)}
            className={`mr-2 rounded-full border px-3 py-1.5 ${
              accountId === undefined ? "border-accent bg-accent-soft" : "border-glass-border"
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
                accountId === a.id ? "border-accent bg-accent-soft" : "border-glass-border"
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
              categoryId === undefined ? "border-accent bg-accent-soft" : "border-glass-border"
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
                categoryId === c.id ? "border-accent bg-accent-soft" : "border-glass-border"
              }`}
            >
              <Text className={categoryId === c.id ? "text-accent" : "text-fg-muted"}>
                {c.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
          {(
            [
              ["all", "All Types"],
              ["recurring", "Recurring"],
              ["transfer", "Transfers"],
            ] as const
          ).map(([value, label]) => (
            <Pressable
              key={value}
              onPress={() => setTypeFilter(value)}
              className={`mr-2 rounded-full border px-3 py-1.5 ${
                typeFilter === value ? "border-accent bg-accent-soft" : "border-glass-border"
              }`}
            >
              <Text className={typeFilter === value ? "text-accent" : "text-fg-muted"}>{label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <SummaryBand
          incomeMinor={totals.incomeMinor}
          expenseMinor={totals.expenseMinor}
          currency={currency}
        />
        {hiddenFutureCount > 0 && (
          <Text className="text-xs text-fg-muted">
            {hiddenFutureCount} upcoming transaction{hiddenFutureCount === 1 ? "" : "s"} hidden — Show
            Future Transactions is off.
          </Text>
        )}
      </View>

      <FlatList
        data={visibleRows}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<EmptyState message="No transactions for this filter." />}
        renderItem={({ item }) => (
          <TransactionListItem
            transaction={item}
            currency={accounts?.find((a) => a.id === item.accountId)?.currency ?? "INR"}
            categoryName={categoryName(item.categoryId)}
            fromAccountName={item.type === "transfer" ? accountName(item.accountId) : undefined}
            toAccountName={item.type === "transfer" ? accountName(item.toAccountId) : undefined}
            viewingAccountId={accountId}
            showActionIcons
            showDuplicateIcon
            onDelete={() => confirmDeleteTransaction(db, item, () => {})}
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
