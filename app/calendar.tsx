import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "../components/ui/Icon";

import { CalendarMonthGrid } from "../components/CalendarMonthGrid";
import { GlobalHeader } from "../components/GlobalHeader";
import { db } from "../db/client";
import { useAccounts } from "../db/queries/accounts";
import { useSettings } from "../db/queries/settings";
import { useFilteredTransactions } from "../db/queries/transactions";
import { currentMonthPeriod, monthLabel, monthRange, shiftMonth } from "../services/period";
import { ensureMaterialized } from "../services/recurrence";
import { useThemeColors } from "../theme/palette";

// A shared, global destination now (spec.md §5.19) — reachable from the
// header's calendar icon and the Dashboard shortcut row, not nested under
// the Transactions tab anymore. Same calculations/component as before,
// only the route moved.
export default function CalendarScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const baseCurrency = settings?.baseCurrency ?? "INR";
  const [period, setPeriod] = useState(currentMonthPeriod());
  const range = useMemo(() => monthRange(period), [period]);
  useEffect(() => {
    ensureMaterialized(db, { through: range.end });
  }, [range.end]);
  const { data: rows } = useFilteredTransactions({ range });
  const { data: accounts } = useAccounts();

  // Spec 5.6: same declutter-only semantics as the other screens — hides
  // future day-cells, only while genuinely viewing the current month; no
  // per-account scoping here (this view is always all-accounts), so it's
  // the global setting alone.
  const now = new Date();
  // Memoized so it's a stable reference the day-totals memo below can depend
  // on directly — rebuilt per render it would invalidate that memo every
  // time, and depending on a .getTime() call isn't allowed in a dep array.
  // Same once-per-mount treatment the Dashboard gives its own `today`.
  const todayDateOnly = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }, []);
  const isCurrentMonth = now.getFullYear() === period.year && now.getMonth() === period.month;
  const hidingFuture = isCurrentMonth && !(settings?.showFutureTxGlobal ?? true);

  // Day totals only include base-currency accounts — summing raw amounts
  // across different currencies without conversion would be silently wrong.
  const expenseByDay = useMemo(() => {
    const totals: Record<number, number> = {};
    const currencyByAccount = new Map((accounts ?? []).map((a) => [a.id, a.currency]));
    for (const row of rows ?? []) {
      if (row.type !== "expense") continue;
      if (currencyByAccount.get(row.accountId) !== baseCurrency) continue;
      if (hidingFuture && row.date > todayDateOnly) continue;
      const day = row.date.getDate();
      totals[day] = (totals[day] ?? 0) + row.amountMinor;
    }
    return totals;
    // baseCurrency is a real filter above, not incidental: without it here,
    // changing the base currency in Settings left these day totals showing
    // the old currency's accounts. todayDateOnly is a fresh Date object each
    // render, so it's depended on by timestamp — same convention as
    // db/queries/transactions.ts — otherwise this memo would rebuild on
    // every render and stop being a memo at all.
  }, [rows, accounts, hidingFuture, baseCurrency, todayDateOnly]);

  return (
    <View className="flex-1 bg-bg">
      <GlobalHeader />
      <ScrollView
        className="flex-1 bg-bg"
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 96 }}
      >
        <View className="mb-4 flex-row items-center justify-between">
          <Pressable onPress={() => setPeriod((p) => shiftMonth(p, -1))} className="p-3" hitSlop={8}>
            <Icon name="chevron-left" size={28} color={colors.fg} />
          </Pressable>
          <Text className="text-base font-medium text-fg">{monthLabel(period)}</Text>
          <Pressable onPress={() => setPeriod((p) => shiftMonth(p, 1))} className="p-3" hitSlop={8}>
            <Icon name="chevron-right" size={28} color={colors.fg} />
          </Pressable>
        </View>
        <CalendarMonthGrid period={period} currency={baseCurrency} expenseByDay={expenseByDay} />
      </ScrollView>
    </View>
  );
}
