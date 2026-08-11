import { useEffect, useMemo, useState } from "react";
import { Link } from "expo-router";
import { FlatList, Pressable, Text, View } from "react-native";

import { BalanceRing } from "../../components/rings/BalanceRing";
import { CurrencyAmount } from "../../components/CurrencyAmount";
import { TransactionListItem } from "../../components/TransactionListItem";
import { EmptyState } from "../../components/ui/EmptyState";
import { db } from "../../db/client";
import { useAccounts } from "../../db/queries/accounts";
import { useAccountBalances } from "../../db/queries/balances";
import { useCategories } from "../../db/queries/categories";
import { useFilteredTransactions } from "../../db/queries/transactions";
import { ACCOUNT_TYPE_LABELS } from "../../constants/accountTypes";
import { getRatesToINR } from "../../services/currency";
import { formatMoney, majorToMinor, minorToMajor } from "../../services/format";
import { getPeriodTotals } from "../../services/balance";
import { currentMonthPeriod, monthLabel, monthRange, shiftMonth } from "../../services/period";

const BASE_CURRENCY = "INR";

export default function DashboardScreen() {
  // Registered as "index" so it's the default landing route for the tab group.
  // NOTE: light token pass only — this screen gets a full structural rebuild
  // in a later phase (net worth gauge, trend chart, asset allocation,
  // over-budget banner, embedded calendar, goals) to match the real web
  // app's dashboard. This pass just keeps it from looking broken in dark
  // mode in the meantime.
  const [period, setPeriod] = useState(currentMonthPeriod());
  const { data: accounts } = useAccounts();
  const balances = useAccountBalances();
  const { data: categories } = useCategories();
  const range = useMemo(() => monthRange(period), [period]);
  const { data: recentTransactions } = useFilteredTransactions({ range });

  const foreignCurrencies = useMemo(() => {
    const set = new Set<string>();
    for (const a of accounts ?? []) {
      if (a.currency !== BASE_CURRENCY) set.add(a.currency);
    }
    return Array.from(set);
  }, [accounts]);

  const [rates, setRates] = useState<Record<string, number>>({});
  useEffect(() => {
    let cancelled = false;
    getRatesToINR(db, foreignCurrencies).then((result) => {
      if (!cancelled) setRates(result);
    });
    return () => {
      cancelled = true;
    };
  }, [foreignCurrencies.join(",")]);

  function toBaseMinor(amountMinor: number, currency: string): number {
    if (currency === BASE_CURRENCY) return amountMinor;
    const rate = rates[currency];
    if (rate === undefined) return 0;
    return majorToMinor(minorToMajor(amountMinor, currency) * rate, BASE_CURRENCY);
  }

  // Net worth: every account's balance converted to INR, credit card debt
  // included (naturally negative) rather than excluded (spec.md §5.4).
  let netWorthMinor = 0;
  let creditCardDebtMinor = 0;
  let incomeMinor = 0;
  let expenseMinor = 0;
  for (const account of accounts ?? []) {
    const balanceMinor = balances[account.id] ?? 0;
    const baseBalance = toBaseMinor(balanceMinor, account.currency);
    netWorthMinor += baseBalance;
    if (account.type === "credit_card" && baseBalance < 0) {
      creditCardDebtMinor += -baseBalance;
    }

    const totals = getPeriodTotals(db, { accountId: account.id, ...range });
    incomeMinor += toBaseMinor(totals.incomeMinor, account.currency);
    expenseMinor += toBaseMinor(totals.expenseMinor, account.currency);
  }

  const categoryName = (id: number | null) => categories?.find((c) => c.id === id)?.name;
  const accountName = (id: number | null) => accounts?.find((a) => a.id === id)?.name;

  return (
    <View className="flex-1 bg-bg">
      <FlatList
        data={(recentTransactions ?? []).slice(0, 5)}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16 }}
        ListHeaderComponent={
          <View className="mb-6 gap-4">
            <View className="items-center gap-1">
              <Text className="text-sm text-fg-muted">Overall Balance</Text>
              <Text className="font-data text-2xl font-bold tabular-nums text-fg">
                {formatMoney(netWorthMinor, BASE_CURRENCY)}
              </Text>
              {creditCardDebtMinor > 0 && (
                <Text className="font-data text-sm tabular-nums text-danger">
                  Credit card debt: {formatMoney(creditCardDebtMinor, BASE_CURRENCY)}
                </Text>
              )}
            </View>

            <View className="flex-row items-center justify-between">
              <Pressable onPress={() => setPeriod((p) => shiftMonth(p, -1))} className="p-2">
                <Text className="text-lg text-fg">‹</Text>
              </Pressable>
              <Text className="text-base font-medium text-fg">{monthLabel(period)}</Text>
              <Pressable onPress={() => setPeriod((p) => shiftMonth(p, 1))} className="p-2">
                <Text className="text-lg text-fg">›</Text>
              </Pressable>
            </View>

            <View className="items-center">
              <BalanceRing incomeMinor={incomeMinor} expenseMinor={expenseMinor} currency={BASE_CURRENCY} />
            </View>

            <View className="flex-row justify-around">
              <View className="items-center">
                <Text className="text-xs text-fg-muted">Income</Text>
                <Text className="font-data text-base font-medium tabular-nums text-success">
                  {formatMoney(incomeMinor, BASE_CURRENCY)}
                </Text>
              </View>
              <View className="items-center">
                <Text className="text-xs text-fg-muted">Expense</Text>
                <Text className="font-data text-base font-medium tabular-nums text-danger">
                  {formatMoney(expenseMinor, BASE_CURRENCY)}
                </Text>
              </View>
            </View>

            <View className="flex-row gap-3">
              <Link href="/transaction/new?type=income" asChild>
                <Pressable className="flex-1 items-center rounded-lg bg-success py-3">
                  <Text className="font-semibold text-white">Income</Text>
                </Pressable>
              </Link>
              <Link href="/transaction/new?type=expense" asChild>
                <Pressable className="flex-1 items-center rounded-lg bg-danger py-3">
                  <Text className="font-semibold text-white">Expense</Text>
                </Pressable>
              </Link>
              <Link href="/transaction/new?type=transfer" asChild>
                <Pressable className="flex-1 items-center rounded-lg bg-transfer py-3">
                  <Text className="font-semibold text-white">Transfer</Text>
                </Pressable>
              </Link>
            </View>

            <View className="gap-2">
              <Text className="text-base font-semibold text-fg">Accounts</Text>
              {(accounts ?? []).map((a) => (
                <Link key={a.id} href={`/accounts/${a.id}`} asChild>
                  <Pressable className="flex-row items-center justify-between py-2">
                    <View className="flex-row items-center gap-2">
                      <View style={{ backgroundColor: a.color }} className="h-3 w-3 rounded-full" />
                      <View>
                        <Text className="text-fg">{a.name}</Text>
                        <Text className="text-xs text-fg-muted">
                          {ACCOUNT_TYPE_LABELS[a.type]}
                        </Text>
                      </View>
                    </View>
                    <CurrencyAmount
                      amountMinor={balances[a.id] ?? 0}
                      currency={a.currency}
                      className="font-medium text-fg"
                    />
                  </Pressable>
                </Link>
              ))}
              {(accounts ?? []).length === 0 && (
                <Link href="/account/new" asChild>
                  <Pressable className="items-center rounded-lg border border-dashed border-border py-4">
                    <Text className="text-fg-muted">+ Add your first account</Text>
                  </Pressable>
                </Link>
              )}
            </View>

            <View className="flex-row items-center justify-between">
              <Text className="text-base font-semibold text-fg">
                Recent Transactions
              </Text>
              <Link href="/transactions" asChild>
                <Pressable>
                  <Text className="text-sm text-accent">See all</Text>
                </Pressable>
              </Link>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <TransactionListItem
            transaction={item}
            currency={accounts?.find((a) => a.id === item.accountId)?.currency ?? BASE_CURRENCY}
            categoryName={categoryName(item.categoryId)}
            transferAccountName={
              item.type === "transfer" ? accountName(item.toAccountId) : undefined
            }
          />
        )}
        ListEmptyComponent={<EmptyState message="No transactions yet." className="py-4" />}
      />
    </View>
  );
}
