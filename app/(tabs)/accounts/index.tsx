import { useEffect, useMemo, useState } from "react";
import { Link } from "expo-router";
import { Pressable, SectionList, Text, View } from "react-native";

import { CurrencyAmount } from "../../../components/CurrencyAmount";
import { FirstVisitHint } from "../../../components/FirstVisitHint";
import { HeaderAction, ScreenHeader } from "../../../components/ScreenHeader";
import { EmptyState } from "../../../components/ui/EmptyState";
import { Icon } from "../../../components/ui/Icon";
import { ACCOUNT_TYPE_LABELS } from "../../../constants/accountTypes";
import { db } from "../../../db/client";
import { useAccounts } from "../../../db/queries/accounts";
import { useFilteredTransactions } from "../../../db/queries/transactions";
import type { AccountType } from "../../../db/schema";
import { getAccountBalanceMinor } from "../../../services/balance";
import { currentMonthPeriod, monthLabel, monthRange, shiftMonth } from "../../../services/period";
import { ensureMaterialized } from "../../../services/recurrence";
import { useThemeColors } from "../../../theme/palette";
import { TAB_BAR_CLEARANCE } from "../../../theme/tabBar";

// Every account type, in the order its group appears. A presentation
// grouping only — nothing about how a type is stored or calculated.
const GROUPS: { title: string; types: AccountType[] }[] = [
  { title: "Cash & bank", types: ["savings", "wallet"] },
  { title: "Credit cards", types: ["credit_card"] },
  { title: "Deposits", types: ["deposit"] },
  { title: "Investments", types: ["investment"] },
];

// Accounts V4 (spec.md §5.24): a clean list — name, type and balance, grouped
// by kind of account. Month arrows stay (balances are "as of the end of the
// viewed month", same as before); each account's month in/out figures live
// on its Account Detail screen rather than repeating on every row.
export default function AccountsListScreen() {
  const colors = useThemeColors();
  const { data: accounts } = useAccounts();
  const [period, setPeriod] = useState(currentMonthPeriod());
  const range = useMemo(() => monthRange(period), [period]);
  useEffect(() => {
    ensureMaterialized(db, { through: range.end });
  }, [range.end]);
  // Subscribed for the repaint, not the rows: balances below are
  // synchronous reads, so an edit elsewhere needs this live query to
  // re-render the list.
  useFilteredTransactions({ range });

  const sections = GROUPS.map((g) => ({
    title: g.title,
    data: (accounts ?? []).filter((a) => g.types.includes(a.type)),
  })).filter((s) => s.data.length > 0);

  return (
    <View className="flex-1 bg-bg">
      <ScreenHeader title="Accounts">
        <HeaderAction icon="plus" label="New account" href="/account/new" />
      </ScreenHeader>
      <SectionList
        sections={sections}
        keyExtractor={(item) => String(item.id)}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: TAB_BAR_CLEARANCE }}
        ListHeaderComponent={
          <View className="gap-3">
            <FirstVisitHint id="accounts" />
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
          </View>
        }
        ListEmptyComponent={<EmptyState message="No accounts yet. Tap + to add the first place your money lives." />}
        renderSectionHeader={({ section }) => (
          <Text accessibilityRole="header" className="mt-6 text-sm font-medium text-fg-muted">
            {section.title}
          </Text>
        )}
        renderItem={({ item }) => {
          // "As of" the viewed month's end, not always today — matches the
          // Dashboard/Account Detail's period-scoped balance.
          const balanceMinor = getAccountBalanceMinor(db, item.id, range.end);
          return (
            <Link href={`/accounts/${item.id}`} asChild>
              <Pressable
                accessibilityRole="button"
                className="min-h-16 flex-row items-center gap-3 border-b border-border py-3 active:opacity-70"
              >
                <View
                  style={{ backgroundColor: item.color }}
                  className="h-10 w-10 items-center justify-center rounded-full"
                >
                  <Icon name={item.icon} size={18} color="#fff" />
                </View>
                <View className="flex-1">
                  <Text className="text-base text-fg" numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text className="text-xs text-fg-subtle">{ACCOUNT_TYPE_LABELS[item.type]}</Text>
                </View>
                <CurrencyAmount
                  amountMinor={balanceMinor}
                  currency={item.currency}
                  stacked
                  align="flex-end"
                  className="text-base font-semibold text-fg"
                />
              </Pressable>
            </Link>
          );
        }}
      />
    </View>
  );
}
