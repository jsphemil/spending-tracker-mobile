import { useEffect, useMemo, useState } from "react";
import { Link } from "expo-router";
import { FlatList, Pressable, Text, View } from "react-native";
import { Icon } from "../../../components/ui/Icon";

import { db } from "../../../db/client";
import { useAccounts } from "../../../db/queries/accounts";
import { useFilteredTransactions } from "../../../db/queries/transactions";
import { ACCOUNT_TYPE_LABELS } from "../../../constants/accountTypes";
import { getAccountBalanceMinor } from "../../../services/balance";
import { formatMoney } from "../../../services/format";
import { currentMonthPeriod, monthLabel, monthRange, shiftMonth } from "../../../services/period";
import { ensureMaterialized } from "../../../services/recurrence";
import { CurrencyAmount } from "../../../components/CurrencyAmount";
import { EmptyState } from "../../../components/ui/EmptyState";
import { GlobalFab } from "../../../components/GlobalFab";
import { GlobalHeader } from "../../../components/GlobalHeader";
import { TAB_BAR_CLEARANCE } from "../../../theme/tabBar";
import { useThemeColors } from "../../../theme/palette";

interface AccountFlow {
  incomeMinor: number;
  expenseMinor: number;
  transferInMinor: number;
  transferOutMinor: number;
}

export default function AccountsListScreen() {
  const colors = useThemeColors();
  const { data: accounts } = useAccounts();
  const [period, setPeriod] = useState(currentMonthPeriod());
  const range = useMemo(() => monthRange(period), [period]);
  useEffect(() => {
    ensureMaterialized(db, { through: range.end });
  }, [range.end]);
  const { data: monthTransactions } = useFilteredTransactions({ range });

  // One pass over this month's transactions (not one query per account,
  // and not the mixed-currency-unsafe raw-summing bug fixed elsewhere) —
  // each account's flow stays in that account's own native currency, same
  // as the real app's per-account cards.
  const flowByAccount = new Map<number, AccountFlow>();
  function getFlow(id: number): AccountFlow {
    let f = flowByAccount.get(id);
    if (!f) {
      f = { incomeMinor: 0, expenseMinor: 0, transferInMinor: 0, transferOutMinor: 0 };
      flowByAccount.set(id, f);
    }
    return f;
  }
  for (const t of monthTransactions ?? []) {
    if (t.type === "income") getFlow(t.accountId).incomeMinor += t.amountMinor;
    else if (t.type === "expense") getFlow(t.accountId).expenseMinor += t.amountMinor;
    else if (t.type === "transfer") {
      getFlow(t.accountId).transferOutMinor += t.amountMinor;
      if (t.toAccountId != null) getFlow(t.toAccountId).transferInMinor += t.amountMinor;
    }
  }

  return (
    <View className="flex-1 bg-bg">
      <GlobalHeader />
      <FlatList
        data={accounts ?? []}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: TAB_BAR_CLEARANCE, gap: 12 }}
        ListHeaderComponent={
          <View className="mb-3 flex-row items-center justify-between gap-2">
            <Pressable onPress={() => setPeriod((p) => shiftMonth(p, -1))} className="p-3" hitSlop={8}>
              <Icon name="chevron-left" size={28} color={colors.fg} />
            </Pressable>
            <Text className="flex-1 text-center text-base font-medium text-fg">{monthLabel(period)}</Text>
            <Pressable onPress={() => setPeriod((p) => shiftMonth(p, 1))} className="p-3" hitSlop={8}>
              <Icon name="chevron-right" size={28} color={colors.fg} />
            </Pressable>
            <Link href="/account/new" asChild>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="New account"
                className="h-10 w-10 items-center justify-center rounded-full bg-glass"
              >
                <Icon name="plus" size={18} color={colors.fg} />
              </Pressable>
            </Link>
          </View>
        }
        ListEmptyComponent={<EmptyState message="No accounts yet." />}
        renderItem={({ item }) => {
          const flow = getFlow(item.id);
          const netTransfer = flow.transferInMinor - flow.transferOutMinor;
          // "As of" the viewed month's end, not always today — matches
          // the Dashboard/Account Detail's period-scoped balance.
          const balanceMinor = getAccountBalanceMinor(db, item.id, range.end);

          return (
            <Link href={`/accounts/${item.id}`} asChild>
              <Pressable className="rounded-card border border-glass-border bg-glass p-4">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-3">
                    <View
                      style={{ backgroundColor: item.color }}
                      className="h-10 w-10 items-center justify-center rounded-full"
                    >
                      <Icon name={item.icon} size={18} color="#fff" />
                    </View>
                    <View>
                      <Text className="text-base font-medium text-fg">{item.name}</Text>
                      <Text className="text-sm text-fg-muted">{ACCOUNT_TYPE_LABELS[item.type]}</Text>
                    </View>
                  </View>
                  <CurrencyAmount
                    amountMinor={balanceMinor}
                    currency={item.currency}
                    className="text-base font-semibold text-fg"
                  />
                </View>

                <View className="mt-3 flex-row gap-4 border-t border-glass-border pt-3">
                  <View className="flex-1">
                    <Text className="text-xs text-fg-muted">Income</Text>
                    <Text className="font-data text-xs font-medium tabular-nums text-success">
                      {formatMoney(flow.incomeMinor, item.currency)}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs text-fg-muted">Expense</Text>
                    <Text className="font-data text-xs font-medium tabular-nums text-danger">
                      {formatMoney(flow.expenseMinor, item.currency)}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs text-fg-muted">Transfers</Text>
                    <Text
                      className={`font-data text-xs font-medium tabular-nums ${netTransfer >= 0 ? "text-accent" : "text-danger"}`}
                    >
                      {netTransfer >= 0 ? "+" : ""}
                      {formatMoney(netTransfer, item.currency)}
                    </Text>
                  </View>
                </View>
              </Pressable>
            </Link>
          );
        }}
      />
      <GlobalFab insideTabs />
    </View>
  );
}
