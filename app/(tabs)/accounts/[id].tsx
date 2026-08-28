import { useEffect, useMemo, useState } from "react";
import { Icon } from "../../../components/ui/Icon";
import { Link, Stack, useLocalSearchParams } from "expo-router";
import { FlatList, Pressable, Text, View } from "react-native";

import { confirmDeleteTransaction } from "../../../components/confirmDeleteTransaction";
import { CreditUsageRing } from "../../../components/rings/CreditUsageRing";
import { GaugeRing } from "../../../components/rings/GaugeRing";
import { CurrencyAmount } from "../../../components/CurrencyAmount";
import { TransactionListItem } from "../../../components/TransactionListItem";
import { EmptyState } from "../../../components/ui/EmptyState";
import { db } from "../../../db/client";
import { useAccount, useAccounts } from "../../../db/queries/accounts";
import { useCategories } from "../../../db/queries/categories";
import { useSettings } from "../../../db/queries/settings";
import { useAccountTransactions } from "../../../db/queries/transactions";
import { addToBucket, sortedBuckets, type Bucket } from "../../../services/breakdown";
import {
  getAccountBalanceMinor,
  getCreditCardOwedMinor,
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
  const { account } = useAccount(accountId);
  const { data: accounts } = useAccounts();
  const { settings } = useSettings();
  const colors = useThemeColors();
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
    { title: "Expense by category", buckets: sortedBuckets(expenseByCategory), total: expenseMinor, color: "text-danger" },
    {
      title: "Transfers in by account",
      buckets: sortedBuckets(transferInByAccount),
      total: transferInMinor,
      color: "text-accent",
    },
    {
      title: "Transfers out by account",
      buckets: sortedBuckets(transferOutByAccount),
      total: transferOutMinor,
      color: "text-danger",
    },
  ].filter((section) => section.buckets.length > 0);

  const budgetActive = effectiveSettings.budgetModeEnabled && account.budgetMonthlyMinor != null;
  const overBudget = budgetActive && totalOutMinor > account.budgetMonthlyMinor!;

  return (
    <View className="flex-1 bg-bg">
      <Stack.Screen
        options={{
          title: account.name,
          headerRight: () => (
            <Link href={`/account/${accountId}/edit`} asChild>
              <Pressable hitSlop={8} className="px-2">
                <Icon name="pencil-outline" size={22} color={colors.accent} />
              </Pressable>
            </Link>
          ),
        }}
      />
      <FlatList
        data={visibleTransactions}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: TAB_BAR_CLEARANCE, gap: 4 }}
        ListHeaderComponent={
          <View className="mb-6 gap-4">
            <View className="w-full flex-row items-center justify-between">
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
                <Pressable className="flex-1 items-center rounded-lg bg-success py-3">
                  <Text className="font-semibold text-white">Income</Text>
                </Pressable>
              </Link>
              <Link href={`/transaction/new?accountId=${accountId}&type=expense`} asChild>
                <Pressable className="flex-1 items-center rounded-lg bg-danger py-3">
                  <Text className="font-semibold text-white">Expense</Text>
                </Pressable>
              </Link>
              <Link href={`/transaction/new?accountId=${accountId}&type=transfer`} asChild>
                <Pressable className="flex-1 items-center rounded-lg bg-transfer py-3">
                  <Text className="font-semibold text-white">Transfer</Text>
                </Pressable>
              </Link>
            </View>

            {budgetActive && (
              <View className="gap-1.5 rounded-card bg-surface-2 p-3.5">
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm font-medium text-fg">Budget Mode</Text>
                  <Text className={`text-sm ${overBudget ? "font-medium text-danger" : "text-fg-muted"}`}>
                    {formatMoney(totalOutMinor, account.currency)} of{" "}
                    {formatMoney(account.budgetMonthlyMinor!, account.currency)}
                  </Text>
                </View>
                <View className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                  <View
                    className={`h-full ${overBudget ? "bg-danger" : "bg-accent"}`}
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

            <View className="flex-row flex-wrap gap-3">
              <View className="min-w-[45%] flex-1 rounded-card bg-surface-2 p-3.5">
                <Text className="text-xs text-fg-muted">Carry forward</Text>
                <CurrencyAmount
                  amountMinor={carryForwardMinor}
                  currency={account.currency}
                  className="font-data mt-1.5 text-base font-semibold tabular-nums text-fg"
                />
              </View>
              <View className="min-w-[45%] flex-1 rounded-card bg-surface-2 p-3.5">
                <Text className="text-xs text-fg-muted">Total in</Text>
                <CurrencyAmount
                  amountMinor={totalInMinor}
                  currency={account.currency}
                  prefix="+"
                  className="font-data mt-1.5 text-base font-semibold tabular-nums text-success"
                />
              </View>
              <View className="min-w-[45%] flex-1 rounded-card bg-surface-2 p-3.5">
                <Text className="text-xs text-fg-muted">Total out</Text>
                <CurrencyAmount
                  amountMinor={totalOutMinor}
                  currency={account.currency}
                  prefix="−"
                  className="font-data mt-1.5 text-base font-semibold tabular-nums text-danger"
                />
              </View>
              <View className="min-w-[45%] flex-1 rounded-card bg-surface-2 p-3.5">
                <Text className="text-xs text-fg-muted">Left to spend</Text>
                <CurrencyAmount
                  amountMinor={leftToSpendMinor}
                  currency={account.currency}
                  className={`font-data mt-1.5 text-base font-semibold tabular-nums ${leftToSpendMinor >= 0 ? "text-success" : "text-danger"}`}
                />
              </View>
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
              <View className="gap-3 rounded-card border border-glass-border bg-glass p-4">
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm font-semibold text-fg">Breakdown</Text>
                  <Link href={`/transactions?accountId=${accountId}`} asChild>
                    <Pressable>
                      <Text className="text-xs font-medium text-accent">Full history</Text>
                    </Pressable>
                  </Link>
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

            <Text className="text-sm font-semibold text-fg">{monthLabel(period)} transactions</Text>
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
            viewingAccountId={accountId}
            showActionIcons
            showDuplicateIcon
            onDelete={() => confirmDeleteTransaction(db, item, () => {})}
          />
        )}
      />
    </View>
  );
}
