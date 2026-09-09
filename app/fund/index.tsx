import { useMemo, useState } from "react";
import { Link } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "../../components/ui/EmptyState";
import { FundRow } from "../../components/FundRow";
import { GlobalHeader } from "../../components/GlobalHeader";
import { Icon } from "../../components/ui/Icon";
import { UnconvertedCurrenciesNote } from "../../components/UnconvertedCurrenciesNote";
import { db } from "../../db/client";
import { useAccounts } from "../../db/queries/accounts";
import { useFunds } from "../../db/queries/funds";
import { useSettings } from "../../db/queries/settings";
import { useFilteredTransactions } from "../../db/queries/transactions";
import { getAccountBalanceMinor } from "../../services/balance";
import { useBaseConverter } from "../../hooks/useBaseConverter";
import { formatMoney } from "../../services/format";
import {
  computeFundProgress,
  emptyFundBalance,
  getFundBalances,
  getFundLinkedCurrencies,
  sumEarmarkedMinor,
} from "../../services/funds";
import { currentMonthPeriod, monthRange } from "../../services/period";
import { useThemeColors } from "../../theme/palette";

export default function FundsListScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const { settings } = useSettings();
  const baseCurrency = settings?.baseCurrency ?? "INR";
  const { data: funds } = useFunds();
  const { data: accounts } = useAccounts();
  const [showClosed, setShowClosed] = useState(false);

  // Fund-linked expenses are recorded in their account's currency, so the
  // converter needs those too — not just the account currencies.
  const linkedCurrencies = getFundLinkedCurrencies(db);
  const { toBaseMinor, unconvertedCurrencies } = useBaseConverter([
    ...(accounts ?? []).map((a) => a.currency),
    ...linkedCurrencies,
  ]);

  // Subscribed for the re-render, not the rows: getFundBalances and
  // getAccountBalanceMinor are plain synchronous reads that aren't reactive
  // on their own, and a fund's balance moves whenever a linked expense is
  // edited. Same pattern (and same reason) as the Dashboard's bare
  // useFilteredTransactions call — don't "clean up" the unused result.
  const range = useMemo(() => monthRange(currentMonthPeriod()), []);
  useFilteredTransactions({ range });

  const balances = getFundBalances(db, toBaseMinor, range.end);
  const earmarkedMinor = sumEarmarkedMinor(balances);

  let netWorthMinor = 0;
  for (const account of accounts ?? []) {
    netWorthMinor += toBaseMinor(
      getAccountBalanceMinor(db, account.id, range.end),
      account.currency,
    );
  }
  const unallocatedMinor = netWorthMinor - earmarkedMinor;

  const activeFunds = (funds ?? []).filter((f) => f.status === "active");
  const closedFunds = (funds ?? []).filter((f) => f.status === "closed");

  return (
    <View className="flex-1 bg-bg">
      <GlobalHeader />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 96, gap: 16 }}
      >
        <View className="rounded-card border border-glass-border bg-glass p-4">
          <Text className="text-xs font-semibold uppercase tracking-wide text-fg-muted">
            Unallocated
          </Text>
          <Text className="font-data mt-1 text-3xl font-bold tabular-nums text-fg">
            {formatMoney(unallocatedMinor, baseCurrency)}
          </Text>
          <View className="mt-3 flex-row gap-3">
            <View className="flex-1 rounded-card bg-surface-2 p-3">
              <Text className="text-[11px] text-fg-muted">Net worth</Text>
              <Text className="font-data mt-1 text-base font-semibold tabular-nums text-fg">
                {formatMoney(netWorthMinor, baseCurrency)}
              </Text>
            </View>
            <View className="flex-1 rounded-card bg-surface-2 p-3">
              <Text className="text-[11px] text-fg-muted">Earmarked</Text>
              <Text className="font-data mt-1 text-base font-semibold tabular-nums text-accent">
                {formatMoney(earmarkedMinor, baseCurrency)}
              </Text>
            </View>
          </View>
          <Text className="mt-3 text-xs text-fg-muted">
            Earmarking never moves money or changes your net worth — it just marks part of it as
            spoken for. This is unallocated net worth, not cash on hand.
          </Text>
          {earmarkedMinor > netWorthMinor && (
            <Text className="mt-2 text-xs font-medium text-danger">
              You&rsquo;ve earmarked more than your net worth.
            </Text>
          )}
          <UnconvertedCurrenciesNote currencies={unconvertedCurrencies} subject="These totals" />
        </View>

        {activeFunds.length === 0 ? (
          <View className="rounded-card border border-glass-border bg-glass p-4">
            <EmptyState message="No funds yet. Set money aside for something specific — a laptop, a trip, next year's insurance — without moving it out of your accounts." />
            <Link href="/fund/new" asChild>
              <Pressable className="mt-2 items-center rounded-full border border-glass-border bg-glass py-3">
                <Text className="text-base font-semibold text-accent">Create a fund</Text>
              </Pressable>
            </Link>
          </View>
        ) : (
          <View className="gap-4 rounded-card border border-glass-border bg-glass p-4">
            {activeFunds.map((fund) => (
              <FundRow
                key={fund.id}
                fund={fund}
                balance={balances.get(fund.id) ?? emptyFundBalance(fund.id)}
                progress={computeFundProgress(
                  fund.targetAmountMinor,
                  balances.get(fund.id) ?? emptyFundBalance(fund.id),
                )}
                baseCurrency={baseCurrency}
              />
            ))}
          </View>
        )}

        {closedFunds.length > 0 && (
          <View className="rounded-card border border-glass-border bg-glass p-4">
            <Pressable
              onPress={() => setShowClosed((v) => !v)}
              className="flex-row items-center justify-between"
            >
              <Text className="text-sm font-display text-fg">Closed ({closedFunds.length})</Text>
              <Icon
                name={showClosed ? "chevron-up" : "chevron-down"}
                size={18}
                color={colors.fgMuted}
              />
            </Pressable>
            {showClosed && (
              <View className="mt-4 gap-4">
                {closedFunds.map((fund) => (
                  <FundRow
                    key={fund.id}
                    fund={fund}
                    balance={balances.get(fund.id) ?? emptyFundBalance(fund.id)}
                    progress={computeFundProgress(
                      fund.targetAmountMinor,
                      balances.get(fund.id) ?? emptyFundBalance(fund.id),
                    )}
                    baseCurrency={baseCurrency}
                  />
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <Link href="/fund/new" asChild>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="New fund"
          className="absolute h-14 w-14 items-center justify-center rounded-full bg-accent"
          style={{ bottom: insets.bottom + 20, right: 24 }}
        >
          <Icon name="plus" size={26} color="#ffffff" strokeWidth={2.5} />
        </Pressable>
      </Link>
    </View>
  );
}
