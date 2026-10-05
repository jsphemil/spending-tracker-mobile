import { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { Pressable, SectionList, Text, View } from "react-native";
import { Searchbar } from "react-native-paper";

import { confirmDeleteTransaction } from "../../../components/confirmDeleteTransaction";
import { HeaderAction, ScreenHeader } from "../../../components/ScreenHeader";
import { FirstVisitHint } from "../../../components/FirstVisitHint";
import {
  MODE_LABELS,
  TransactionFilterSheet,
  TYPE_LABELS,
  type TransactionFilters,
} from "../../../components/TransactionFilterSheet";
import { UnconvertedCurrenciesNote } from "../../../components/UnconvertedCurrenciesNote";
import { TransactionListItem, useTransactionRowExtras } from "../../../components/TransactionListItem";
import { EmptyState } from "../../../components/ui/EmptyState";
import { Icon } from "../../../components/ui/Icon";
import { db } from "../../../db/client";
import { useAccounts } from "../../../db/queries/accounts";
import { useCategories } from "../../../db/queries/categories";
import { useSettings } from "../../../db/queries/settings";
import { useFilteredTransactions } from "../../../db/queries/transactions";
import { useBaseConverter } from "../../../hooks/useBaseConverter";
import { formatMoney } from "../../../services/format";
import { currentMonthPeriod, monthLabel, monthRange, shiftMonth } from "../../../services/period";
import { ensureMaterialized } from "../../../services/recurrence";
import { resolveAccountSettings } from "../../../services/settings";
import { TAB_BAR_CLEARANCE } from "../../../theme/tabBar";
import { useThemeColors } from "../../../theme/palette";

function defaultFilters(): TransactionFilters {
  return {
    mode: "month",
    customFrom: monthRange(currentMonthPeriod()).start,
    customTo: new Date(),
    accountId: undefined,
    categoryId: undefined,
    type: "all",
  };
}

const shortDate = (d: Date) => d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

// "Today", "Yesterday", else e.g. "Mon, 20 Oct" (with the year when it
// isn't this year).
function dayHeading(day: Date, today: Date): string {
  const diff = Math.round((today.getTime() - day.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return day.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(day.getFullYear() !== today.getFullYear() ? { year: "numeric" } : {}),
  });
}

// Transactions V4 (spec.md §5.24): the list first. Filters live in a sheet
// behind the Filter action (its dot and the chips under the summary show
// what's applied), search sits behind the Search action, and the list is
// grouped by day. The filtering, totals and future-hiding rules are V2's,
// unchanged — only where the controls live has moved.
export default function TransactionsListScreen() {
  const colors = useThemeColors();
  const { settings } = useSettings();
  const baseCurrency = settings?.baseCurrency ?? "INR";
  const [filters, setFilters] = useState<TransactionFilters>(defaultFilters);
  const [period, setPeriod] = useState(currentMonthPeriod());
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { mode: filterMode, customFrom, customTo, accountId, categoryId, type: typeFilter } = filters;
  const update = (next: Partial<TransactionFilters>) => setFilters((f) => ({ ...f, ...next }));

  // Account Detail's "Full history" links here with ?accountId= — apply it
  // as the account filter (it shows as a removable chip like any other).
  // Adjusted during render rather than in an effect, so a new link applies
  // before the first paint instead of flashing the unfiltered list.
  const { accountId: accountIdParam } = useLocalSearchParams<{ accountId?: string }>();
  const [appliedParam, setAppliedParam] = useState<string | undefined>(undefined);
  if (accountIdParam !== appliedParam) {
    setAppliedParam(accountIdParam);
    if (accountIdParam) setFilters((f) => ({ ...f, accountId: Number(accountIdParam), mode: "allTime" }));
  }

  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();
  const rowExtras = useTransactionRowExtras();
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
    // Deliberately the primitive, not `range`: that object is rebuilt each
    // render, so depending on it would re-materialize on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range?.end]);
  const { data: rows } = useFilteredTransactions({ accountId, categoryId, range });

  const categoryName = (id: number | null) => categories?.find((c) => c.id === id)?.name;
  const accountName = (id: number | null) => accounts?.find((a) => a.id === id)?.name;

  // Type filter, applied client-side over the already-fetched rows (as V2's
  // Recurring/Transfers filter was). A real filter, not a declutter toggle,
  // so it affects totals too. Income/Expense added in V4.
  const typeFilteredRows = (rows ?? []).filter((t) => {
    if (typeFilter === "recurring") return t.recurringRuleId != null;
    if (typeFilter === "transfer") return t.type === "transfer";
    if (typeFilter === "income") return t.type === "income";
    if (typeFilter === "expense") return t.type === "expense";
    return true;
  });

  // Search narrows the same rows the totals are built from, so the summary
  // answers "how much on X" as well as listing it. Matches the note,
  // category, account names and the amount.
  const q = query.trim().toLowerCase();
  const searchedRows = q
    ? typeFilteredRows.filter((t) =>
        [
          t.description,
          categoryName(t.categoryId),
          accountName(t.accountId),
          accountName(t.toAccountId),
          (t.amountMinor / 100).toFixed(2),
        ].some((field) => field?.toLowerCase().includes(q)),
      )
    : typeFilteredRows;

  // Spec 5.6: hides future-dated *rows* only (a declutter toggle — totals
  // stay complete), and only while genuinely viewing the current month.
  // With one account selected, its own override (if any) wins over the
  // global setting; with "All accounts" it's the global setting alone.
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
  const visibleRows = hidingFuture ? searchedRows.filter((t) => t.date <= todayDateOnly) : searchedRows;
  const hiddenFutureCount = searchedRows.length - visibleRows.length;

  // With a single account selected every row already shares that account's
  // currency, so totals show natively. Across "All accounts" rows can mix
  // currencies — everything is converted to the base currency before
  // summing rather than adding raw minor units of different currencies.
  const currency = accountId
    ? accounts?.find((a) => a.id === accountId)?.currency ?? baseCurrency
    : baseCurrency;
  const { toBaseMinor, unconvertedCurrencies } = useBaseConverter((accounts ?? []).map((a) => a.currency));
  const totals = searchedRows.reduce(
    (acc, t) => {
      const txCurrency = accounts?.find((a) => a.id === t.accountId)?.currency ?? "INR";
      const amountMinor = accountId ? t.amountMinor : toBaseMinor(t.amountMinor, txCurrency);
      if (t.type === "income") acc.incomeMinor += amountMinor;
      if (t.type === "expense") acc.expenseMinor += amountMinor;
      return acc;
    },
    { incomeMinor: 0, expenseMinor: 0 },
  );

  // Rows arrive newest first; group consecutive days.
  const sections: { title: string; data: typeof visibleRows }[] = [];
  for (const t of visibleRows) {
    const title = dayHeading(new Date(t.date.getFullYear(), t.date.getMonth(), t.date.getDate()), todayDateOnly);
    const last = sections[sections.length - 1];
    if (last?.title === title) last.data.push(t);
    else sections.push({ title, data: [t] });
  }

  // What's applied, as removable chips — the screen's only filter UI.
  const activeChips: { key: string; label: string; clear: () => void }[] = [];
  if (filterMode !== "month") {
    activeChips.push({
      key: "mode",
      label: filterMode === "custom" ? `${shortDate(customFrom)} – ${shortDate(customTo)}` : MODE_LABELS.allTime,
      clear: () => update({ mode: "month" }),
    });
  }
  if (typeFilter !== "all") activeChips.push({ key: "type", label: TYPE_LABELS[typeFilter], clear: () => update({ type: "all" }) });
  if (accountId !== undefined) {
    activeChips.push({ key: "account", label: accountName(accountId) ?? "Account", clear: () => update({ accountId: undefined }) });
  }
  if (categoryId !== undefined) {
    activeChips.push({ key: "category", label: categoryName(categoryId) ?? "Category", clear: () => update({ categoryId: undefined }) });
  }

  const listHeader = (
    <View className="gap-3 pb-2">
      {searchOpen && (
        <Searchbar
          placeholder="Search notes, categories, accounts"
          value={query}
          onChangeText={setQuery}
          autoFocus
          style={{ backgroundColor: colors.surface2, elevation: 0 }}
          inputStyle={{ color: colors.fg }}
          placeholderTextColor={colors.fgSubtle}
          iconColor={colors.fgMuted}
        />
      )}
      {filterMode === "month" && (
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

      <View className="flex-row rounded-2xl border border-border bg-surface px-4 py-3">
        <View className="flex-1">
          <Text className="text-xs text-fg-muted">Income</Text>
          <Text className="font-data text-lg font-semibold tabular-nums text-success">
            {formatMoney(totals.incomeMinor, currency)}
          </Text>
        </View>
        <View className="flex-1 items-end">
          <Text className="text-xs text-fg-muted">Spending</Text>
          <Text className="font-data text-lg font-semibold tabular-nums text-fg">
            {formatMoney(totals.expenseMinor, currency)}
          </Text>
        </View>
      </View>

      {activeChips.length > 0 && (
        <View className="flex-row flex-wrap gap-2">
          {activeChips.map((chip) => (
            <Pressable
              key={chip.key}
              onPress={chip.clear}
              accessibilityRole="button"
              accessibilityLabel={`Remove filter ${chip.label}`}
              className="min-h-9 flex-row items-center gap-1.5 rounded-full bg-accent-soft px-3"
            >
              <Text className="text-sm text-accent">{chip.label}</Text>
              <Icon name="close" size={14} color={colors.accent} />
            </Pressable>
          ))}
        </View>
      )}

      {/* Only meaningful across "All accounts": with one account selected
          its rows already share that account's currency. */}
      {!accountId && <UnconvertedCurrenciesNote currencies={unconvertedCurrencies} subject="These totals" />}
      {hiddenFutureCount > 0 && (
        <Text className="text-xs text-fg-muted">
          {hiddenFutureCount} upcoming transaction{hiddenFutureCount === 1 ? "" : "s"} hidden — Show Future
          Transactions is off.
        </Text>
      )}
      <FirstVisitHint id="transactions" />
    </View>
  );

  return (
    <View className="flex-1 bg-bg">
      <ScreenHeader title="Transactions">
        <HeaderAction
          icon="magnify"
          label={searchOpen ? "Close search" : "Search"}
          active={q.length > 0}
          onPress={() => {
            if (searchOpen) setQuery("");
            setSearchOpen((o) => !o);
          }}
        />
        <HeaderAction icon="filter-variant" label="Filter" active={activeChips.length > 0} onPress={() => setFilterOpen(true)} />
        <HeaderAction icon="calendar-month-outline" label="Calendar" href="/calendar" />
      </ScreenHeader>

      <SectionList
        sections={sections}
        keyExtractor={(item) => String(item.id)}
        stickySectionHeadersEnabled={false}
        // Low-end devices (spec.md §5.24): render in small batches.
        initialNumToRender={12}
        maxToRenderPerBatch={8}
        windowSize={7}
        removeClippedSubviews
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: TAB_BAR_CLEARANCE }}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          <EmptyState message={q ? `Nothing matches "${query.trim()}".` : "No transactions for these filters."} />
        }
        renderSectionHeader={({ section }) => (
          <Text accessibilityRole="header" className="mt-4 text-xs font-medium text-fg-muted">
            {section.title}
          </Text>
        )}
        renderItem={({ item }) => (
          <TransactionListItem
            transaction={item}
            currency={accounts?.find((a) => a.id === item.accountId)?.currency ?? "INR"}
            categoryName={categoryName(item.categoryId)}
            fromAccountName={item.type === "transfer" ? accountName(item.accountId) : undefined}
            toAccountName={item.type === "transfer" ? accountName(item.toAccountId) : undefined}
            accountName={accountName(item.accountId)}
            viewingAccountId={accountId}
            showDate={false}
            onDelete={() => confirmDeleteTransaction(db, item, () => {})}
            extras={rowExtras}
          />
        )}
      />

      {filterOpen && (
        <TransactionFilterSheet
          filters={filters}
          onChange={update}
          onReset={() => setFilters(defaultFilters())}
          onClose={() => setFilterOpen(false)}
          accounts={accounts ?? []}
          categories={categories ?? []}
          resultCount={visibleRows.length}
        />
      )}
    </View>
  );
}
