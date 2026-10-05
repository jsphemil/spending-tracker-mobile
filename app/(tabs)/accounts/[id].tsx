import { useEffect, useMemo, useState } from "react";
import { Icon } from "../../../components/ui/Icon";
import { Link, Stack, useLocalSearchParams, useRouter } from "expo-router";
import { FlatList, Pressable, Text, View } from "react-native";

import { AccountSwitcherSheet } from "../../../components/AccountSwitcherSheet";
import { confirmDeleteTransaction } from "../../../components/confirmDeleteTransaction";
import { CreditUsageRing } from "../../../components/rings/CreditUsageRing";
import { GaugeRing } from "../../../components/rings/GaugeRing";
import { CurrencyAmount } from "../../../components/CurrencyAmount";
import { TransactionListItem, useTransactionRowExtras } from "../../../components/TransactionListItem";
import { EmptyState } from "../../../components/ui/EmptyState";
import { db } from "../../../db/client";
import { useAccount, useAccounts } from "../../../db/queries/accounts";
import { useCategories } from "../../../db/queries/categories";
import { useSettings } from "../../../db/queries/settings";
import { useAccountTransactions } from "../../../db/queries/transactions";
import { addToBucket, sortedBuckets, type Bucket } from "../../../services/breakdown";
import {
  getAccountBalanceMinor,
  getDebtPayoffProjection,
} from "../../../services/balance";
import { formatMoney } from "../../../services/format";
import {
  currentMonthPeriod,
  daysRemainingInMonth,
  monthLabel,
  monthRange,
  shiftMonth,
} from "../../../services/period";
import { ensureMaterialized } from "../../../services/recurrence";
import { resolveAccountSettings } from "../../../services/settings";
import { useThemeColors } from "../../../theme/palette";
import { useBaseCurrencyEquivalent } from "../../../hooks/useBaseCurrencyEquivalent";
import { TAB_BAR_CLEARANCE } from "../../../theme/tabBar";

export default function AccountDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const accountId = Number(id);
  const router = useRouter();
  // Header-name account switcher (spec.md §5.1, 2026-09-15). Switching
  // goes through setParams rather than push/replace so this screen stays
  // mounted — the month you've paged to is kept, and Back still returns
  // to the Accounts list in one step.
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const { account } = useAccount(accountId);
  const { data: accounts } = useAccounts();
  const { settings } = useSettings();
  const colors = useThemeColors();
  const rowExtras = useTransactionRowExtras();
  const [period, setPeriod] = useState(currentMonthPeriod());
  const { data: categories } = useCategories();
  const range = useMemo(() => monthRange(period), [period]);
  useEffect(() => {
    ensureMaterialized(db, { through: range.end });
  }, [range.end]);
  const { data: periodTransactions } = useAccountTransactions(accountId, range);

  // "As of" the end of the viewed period, not always today — so navigating
  // to a past month moves these figures the same way Income/Expense do.
  // Computed before the loading guard below (only needs accountId+range,
  // not `account` itself) so the base-currency-equivalent hook — which
  // must run unconditionally on every render — has a real value to
  // convert as soon as `account` becomes available.
  const carryForwardMinor = getAccountBalanceMinor(db, accountId, range.start);
  const endingBalanceMinor = getAccountBalanceMinor(db, accountId, range.end);
  const { baseEquivalentMinor: endingBalanceEquivalentMinor, baseCurrency } = useBaseCurrencyEquivalent(
    endingBalanceMinor,
    account?.currency ?? settings?.baseCurrency ?? "INR",
  );

  if (!account || !settings) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <Text className="text-fg">Loading…</Text>
      </View>
    );
  }

  const effectiveSettings = resolveAccountSettings(account, settings);

  const categoryInfo = (categoryId: number | null) => categories?.find((c) => c.id === categoryId);
  const otherAccountName = (id: number | null) => accounts?.find((a) => a.id === id)?.name ?? "?";

  // Spec 5.6: hides future-dated *rows* from the list only (a declutter
  // toggle, not a recalculation) — totals/balance stay complete since a
  // future-dated transaction is still a real recorded commitment. Only
  // applies while viewing the actual current month.
  const now = new Date();
  const todayDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const isCurrentMonth = now.getFullYear() === period.year && now.getMonth() === period.month;
  const hidingFuture = !effectiveSettings.showFutureTxEnabled && isCurrentMonth;
  const allPeriodTransactions = periodTransactions ?? [];
  const visibleTransactions = hidingFuture
    ? allPeriodTransactions.filter((t) => t.date <= todayDateOnly)
    : allPeriodTransactions;
  const hiddenFutureCount = allPeriodTransactions.length - visibleTransactions.length;

  const debtPayoffProjection = account.type === "credit_card" ? getDebtPayoffProjection(db, accountId) : null;

  // One pass over this month's transactions builds income/expense/transfer
  // totals and the category/counterpart-account breakdown together —
  // mirrors the real app's exact aggregation instead of separate queries.
  let incomeMinor = 0;
  let expenseMinor = 0;
  let transferInMinor = 0;
  let transferOutMinor = 0;
  const incomeByCategory = new Map<string, Bucket>();
  const expenseByCategory = new Map<string, Bucket>();
  const transferInByAccount = new Map<string, Bucket>();
  const transferOutByAccount = new Map<string, Bucket>();

  for (const t of allPeriodTransactions) {
    if (t.type === "income") {
      incomeMinor += t.amountMinor;
      addToBucket(
        incomeByCategory,
        t.isOpeningBalance ? "opening-balance" : (t.categoryId ?? "uncategorized"),
        t.isOpeningBalance ? "Opening Balance" : (categoryInfo(t.categoryId)?.name ?? "Uncategorized"),
        t.isOpeningBalance ? "🏦" : (categoryInfo(t.categoryId)?.icon ?? "❓"),
        t.isOpeningBalance || !categoryInfo(t.categoryId) ? "emoji" : "mdi",
        t.amountMinor,
      );
    } else if (t.type === "expense") {
      expenseMinor += t.amountMinor;
      addToBucket(
        expenseByCategory,
        t.isOpeningBalance ? "opening-balance" : (t.categoryId ?? "uncategorized"),
        t.isOpeningBalance ? "Opening Balance" : (categoryInfo(t.categoryId)?.name ?? "Uncategorized"),
        t.isOpeningBalance ? "🏦" : (categoryInfo(t.categoryId)?.icon ?? "❓"),
        t.isOpeningBalance || !categoryInfo(t.categoryId) ? "emoji" : "mdi",
        t.amountMinor,
      );
    } else {
      if (t.toAccountId === accountId) {
        transferInMinor += t.amountMinor;
        addToBucket(
          transferInByAccount,
          t.accountId,
          otherAccountName(t.accountId),
          "🏦",
          "emoji",
          t.amountMinor,
        );
      }
      if (t.accountId === accountId) {
        transferOutMinor += t.amountMinor;
        addToBucket(
          transferOutByAccount,
          t.toAccountId ?? "unknown",
          otherAccountName(t.toAccountId),
          "🏦",
          "emoji",
          t.amountMinor,
        );
      }
    }
  }

  const totalInMinor = incomeMinor + transferInMinor;
  const totalOutMinor = expenseMinor + transferOutMinor;
  const owedMinor = Math.max(0, -endingBalanceMinor);
  const owedEquivalentMinor =
    endingBalanceEquivalentMinor !== null ? Math.max(0, -endingBalanceEquivalentMinor) : null;
  const availableCreditMinor =
    account.type === "credit_card" && account.creditLimitMinor != null
      ? account.creditLimitMinor - owedMinor
      : null;

  // "Left to spend" reads the same as the ring's center figure — the
  // account's actual running balance (carry forward included), not just
  // this period's in/out, so the two never disagree just because there's
  // any carry forward.
  const leftToSpendMinor =
    account.type === "credit_card" && account.creditLimitMinor != null
      ? availableCreditMinor!
      : endingBalanceMinor;

  const daysRemaining = account.type === "credit_card" ? null : daysRemainingInMonth(period);
  const safeToSpendPerDayMinor =
    daysRemaining !== null && leftToSpendMinor >= 0 ? leftToSpendMinor / daysRemaining : null;

  // A gauge, not a flow-ratio pie: capacity is this account's Carry
  // Forward + Total In, Used eats into it, Available is what's left —
  // exactly leftToSpend/endingBalance.
  const availableFundsMinor = carryForwardMinor + totalInMinor;
  const usedFraction = availableFundsMinor > 0 ? totalOutMinor / availableFundsMinor : null;
  const percentSpent = usedFraction !== null ? usedFraction * 100 : null;

  const breakdownSections = [
    { title: "Income by category", buckets: sortedBuckets(incomeByCategory), total: incomeMinor, color: "text-success" },
    { title: "Expense by category", buckets: sortedBuckets(expenseByCategory), total: expenseMinor, color: "text-fg" },
    {
      title: "Transfers in by account",
      buckets: sortedBuckets(transferInByAccount),
      total: transferInMinor,
      color: "text-transfer",
    },
    {
      title: "Transfers out by account",
      buckets: sortedBuckets(transferOutByAccount),
      total: transferOutMinor,
      color: "text-transfer",
    },
  ].filter((section) => section.buckets.length > 0);

  const budgetActive = effectiveSettings.budgetModeEnabled && account.budgetMonthlyMinor != null;
  const overBudget = budgetActive && totalOutMinor > account.budgetMonthlyMinor!;

  return (
    <View className="flex-1 bg-bg">
      <Stack.Screen
        options={{
          title: account.name,
          headerTitle: () => (
            <Pressable
              onPress={() => setSwitcherOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Switch account"
              hitSlop={8}
              className="flex-row items-center gap-1"
            >
              <Text className="font-display text-[17px] font-bold text-fg" numberOfLines={1}>
                {account.name}
              </Text>
              <Icon name="chevron-down" size={16} color={colors.accent} />
            </Pressable>
          ),
          headerRight: () => (
            <Link href={`/account/${accountId}/edit`} asChild>
              <Pressable hitSlop={8} className="px-2">
                <Icon name="pencil-outline" size={22} color={colors.accent} />
              </Pressable>
            </Link>
          ),
        }}
      />
      {switcherOpen && accounts && (
        <AccountSwitcherSheet
          accounts={accounts}
          currentId={accountId}
          asOfDate={range.end}
          onSelect={(nextId) => {
            setSwitcherOpen(false);
            router.setParams({ id: String(nextId) });
          }}
          onClose={() => setSwitcherOpen(false)}
        />
      )}
      <FlatList
        data={visibleTransactions}
        keyExtractor={(item) => String(item.id)}
        // Low-end devices (spec.md §5.24): render in small batches.
        initialNumToRender={12}
        maxToRenderPerBatch={8}
        windowSize={7}
        removeClippedSubviews
        contentContainerStyle={{ padding: 16, paddingBottom: TAB_BAR_CLEARANCE, gap: 4 }}
        ListHeaderComponent={
          <View className="mb-6 gap-4">
            <View className="w-full flex-row items-center justify-between">
              <Pressable
                onPress={() => setPeriod((p) => shiftMonth(p, -1))}
                accessibilityRole="button"
                accessibilityLabel="Previous month"
                className="h-11 w-11 items-center justify-center"
              >
                <Icon name="chevron-left" size={24} color={colors.fg} />
              </Pressable>
              <Text accessibilityRole="header" className="text-base font-medium text-fg">{monthLabel(period)}</Text>
              <Pressable
                onPress={() => setPeriod((p) => shiftMonth(p, 1))}
                accessibilityRole="button"
                accessibilityLabel="Next month"
                className="h-11 w-11 items-center justify-center"
              >
                <Icon name="chevron-right" size={24} color={colors.fg} />
              </Pressable>
            </View>

            <View className="items-center">
              {account.type === "credit_card" && account.creditLimitMinor != null ? (
                <CreditUsageRing
                  owedMinor={owedMinor}
                  creditLimitMinor={account.creditLimitMinor}
                  currency={account.currency}
                  owedEquivalent={
                    owedEquivalentMinor !== null ? formatMoney(owedEquivalentMinor, baseCurrency) : undefined
                  }
                />
              ) : (
                <GaugeRing
                  usedFraction={usedFraction}
                  centerLabel="Balance available"
                  centerValue={formatMoney(endingBalanceMinor, account.currency)}
                  centerEquivalent={
                    endingBalanceEquivalentMinor !== null
                      ? formatMoney(endingBalanceEquivalentMinor, baseCurrency)
                      : undefined
                  }
                  centerSubtext={percentSpent !== null ? `${percentSpent.toFixed(0)}% spent` : undefined}
                />
              )}
              {account.type !== "credit_card" && endingBalanceMinor < 0 && (
                <Text className="mt-2 text-xs font-medium text-danger">
                  Overdrawn by {formatMoney(-endingBalanceMinor, account.currency)}
                </Text>
              )}
            </View>

            {account.type === "credit_card" && account.creditLimitMinor != null && (
              <View className="gap-1 border-t border-glass-border pt-3">
                <Text className="text-sm text-fg-muted">
                  Credit limit: {formatMoney(account.creditLimitMinor, account.currency)}
                </Text>
                <Text className="text-sm text-fg-muted">
                  Available credit: {formatMoney(availableCreditMinor!, account.currency)}
                </Text>
                {owedMinor > account.creditLimitMinor && (
                  <Text className="text-xs font-medium text-danger">
                    Over limit by {formatMoney(owedMinor - account.creditLimitMinor, account.currency)}
                  </Text>
                )}
              </View>
            )}

            {debtPayoffProjection && (
              <Text className="text-xs text-fg-muted">
                {debtPayoffProjection.projectedDate
                  ? `At your trailing 6-month pace (${formatMoney(debtPayoffProjection.monthlyReductionMinor, account.currency)}/mo), projected debt-free around ${debtPayoffProjection.projectedDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}.`
                  : "Not currently trending toward payoff — balance isn't shrinking over the trailing 6 months."}
              </Text>
            )}

            <View className="w-full flex-row gap-3">
              <Link href={`/transaction/new?accountId=${accountId}&type=income`} asChild>
                <Pressable accessibilityRole="button" className="min-h-11 flex-1 items-center justify-center rounded-full bg-success-soft">
                  <Text className="font-semibold text-success">Income</Text>
                </Pressable>
              </Link>
              <Link href={`/transaction/new?accountId=${accountId}&type=expense`} asChild>
                <Pressable accessibilityRole="button" className="min-h-11 flex-1 items-center justify-center rounded-full bg-danger-soft">
                  <Text className="font-semibold text-danger">Expense</Text>
                </Pressable>
              </Link>
              <Link href={`/transaction/new?accountId=${accountId}&type=transfer`} asChild>
                <Pressable accessibilityRole="button" className="min-h-11 flex-1 items-center justify-center rounded-full bg-transfer-soft">
                  <Text className="font-semibold text-transfer">Transfer</Text>
                </Pressable>
              </Link>
            </View>

            {budgetActive && (
              <View className="gap-1.5 rounded-2xl bg-surface-2 p-3.5">
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm font-medium text-fg">Budget Mode</Text>
                  <Text className={`text-sm ${overBudget ? "font-medium text-danger" : "text-fg-muted"}`}>
                    {formatMoney(totalOutMinor, account.currency)} of{" "}
                    {formatMoney(account.budgetMonthlyMinor!, account.currency)}
                  </Text>
                </View>
                <View className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                  <View
                    className={`h-full ${overBudget ? "bg-danger" : "bg-accent-fill"}`}
                    style={{ width: `${Math.min(100, (totalOutMinor / account.budgetMonthlyMinor!) * 100)}%` }}
                  />
                </View>
                {overBudget && (
                  <Text className="text-xs font-medium text-danger">
                    {formatMoney(totalOutMinor - account.budgetMonthlyMinor!, account.currency)} over this
                    account's monthly budget
                  </Text>
                )}
              </View>
            )}

            {/* V4 (spec.md §5.24): the month's four figures as divider rows,
                not tiles. Same values; "out" is neutral like all spending. */}
            <View>
              <FigureRow label="Carry forward">
                <CurrencyAmount amountMinor={carryForwardMinor} currency={account.currency} className="text-base text-fg" />
              </FigureRow>
              <FigureRow label="Total in">
                <CurrencyAmount amountMinor={totalInMinor} currency={account.currency} prefix="+" className="text-base text-success" />
              </FigureRow>
              <FigureRow label="Total out">
                <CurrencyAmount amountMinor={totalOutMinor} currency={account.currency} prefix="−" className="text-base text-fg" />
              </FigureRow>
              <FigureRow label="Left to spend">
                <CurrencyAmount
                  amountMinor={leftToSpendMinor}
                  currency={account.currency}
                  className={`text-base font-semibold ${leftToSpendMinor >= 0 ? "text-fg" : "text-danger"}`}
                />
              </FigureRow>
            </View>

            {safeToSpendPerDayMinor !== null && (
              <Text className="text-xs text-fg-muted">
                Safe to spend:{" "}
                <Text className="font-data font-medium text-fg">
                  {formatMoney(safeToSpendPerDayMinor, account.currency)}/day
                </Text>{" "}
                ({daysRemaining} days left)
              </Text>
            )}

            {breakdownSections.length > 0 && (
              <View className="mt-2 gap-3">
                <View className="flex-row items-center justify-between">
                  <Text accessibilityRole="header" className="text-base font-display text-fg">Breakdown</Text>
                  {/* `at` makes every tap a new param, so Transactions re-applies
                      the filter even if this account was linked before. */}
                  <Pressable
                    accessibilityRole="link"
                    hitSlop={12}
                    onPress={() => router.navigate(`/transactions?accountId=${accountId}&at=${Date.now()}`)}
                  >
                    <Text className="text-sm font-medium text-accent">Full history</Text>
                  </Pressable>
                </View>
                {breakdownSections.map((section) => (
                  <View key={section.title}>
                    <View className="flex-row items-center justify-between">
                      <Text className="text-xs font-medium text-fg-muted">{section.title}</Text>
                      <Text className={`font-data text-xs font-semibold tabular-nums ${section.color}`}>
                        {formatMoney(section.total, account.currency)}
                      </Text>
                    </View>
                    {section.buckets.map((b) => (
                      <View key={b.key} className="mt-1 flex-row items-center gap-1.5 justify-between">
                        <View className="flex-1 flex-row items-center gap-1.5">
                          {b.iconType === "mdi" ? (
                            <Icon name={b.icon} size={14} color={colors.fgMuted} />
                          ) : (
                            <Text className="text-sm">{b.icon}</Text>
                          )}
                          <Text className="text-sm text-fg">{b.name}</Text>
                        </View>
                        <Text className={`font-data text-sm font-medium tabular-nums ${section.color}`}>
                          {formatMoney(b.totalMinor, account.currency)}
                        </Text>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            )}

            <Text accessibilityRole="header" className="mt-2 text-base font-display text-fg">{monthLabel(period)} transactions</Text>
            {hiddenFutureCount > 0 && (
              <Text className="text-xs text-fg-muted">
                {hiddenFutureCount} upcoming transaction{hiddenFutureCount === 1 ? "" : "s"} hidden — Show
                Future Transactions is off.
              </Text>
            )}
          </View>
        }
        ListEmptyComponent={<EmptyState message="No transactions this month." />}
        renderItem={({ item }) => (
          <TransactionListItem
            transaction={item}
            currency={account.currency}
            categoryName={categoryInfo(item.categoryId)?.name}
            fromAccountName={item.type === "transfer" ? otherAccountName(item.accountId) : undefined}
            toAccountName={item.type === "transfer" ? otherAccountName(item.toAccountId) : undefined}
            accountName={account.name}
            viewingAccountId={accountId}
            onDelete={() => confirmDeleteTransaction(db, item, () => {})}
            extras={rowExtras}
          />
        )}
      />
    </View>
  );
}

function FigureRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="flex-row items-center justify-between border-b border-border py-3">
      <Text className="text-sm text-fg-muted">{label}</Text>
      {children}
    </View>
  );
}
