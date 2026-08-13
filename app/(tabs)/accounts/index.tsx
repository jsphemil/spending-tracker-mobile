import { useEffect, useMemo, useState } from "react";
import { Link } from "expo-router";
import { FlatList, Pressable, Text, View } from "react-native";

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

interface AccountFlow {
  incomeMinor: number;
  expenseMinor: number;
  transferInMinor: number;
  transferOutMinor: number;
}

export default function AccountsListScreen() {
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
      <FlatList
        data={accounts ?? []}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        ListHeaderComponent={
          <View className="mb-3 flex-row items-center justify-center gap-2">
            <Pressable onPress={() => setPeriod((p) => shiftMonth(p, -1))} className="p-3" hitSlop={8}>
              <Text className="text-xl text-fg">‹</Text>
            </Pressable>
            <Text className="text-base font-medium text-fg">{monthLabel(period)}</Text>
            <Pressable onPress={() => setPeriod((p) => shiftMonth(p, 1))} className="p-3" hitSlop={8}>
              <Text className="text-xl text-fg">›</Text>
            </Pressable>
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
              <Pressable className="rounded-xl border border-border bg-surface p-4">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-3">
                    <View style={{ backgroundColor: item.color }} className="h-10 w-10 rounded-full" />
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

                <View className="mt-3 flex-row gap-4 border-t border-border pt-3">
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
      <Link href="/account/new" asChild>
        <Pressable className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-accent">
          <Text className="text-2xl text-white">+</Text>
        </Pressable>
      </Link>
    </View>
  );
}
