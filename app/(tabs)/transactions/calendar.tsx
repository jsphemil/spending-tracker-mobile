import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Icon } from "../../../components/ui/Icon";

import { CalendarMonthGrid } from "../../../components/CalendarMonthGrid";
import { db } from "../../../db/client";
import { useAccounts } from "../../../db/queries/accounts";
import { useSettings } from "../../../db/queries/settings";
import { useFilteredTransactions } from "../../../db/queries/transactions";
import { currentMonthPeriod, monthLabel, monthRange, shiftMonth } from "../../../services/period";
import { ensureMaterialized } from "../../../services/recurrence";
import { useThemeColors } from "../../../theme/palette";

export default function TransactionsCalendarScreen() {
  const colors = useThemeColors();
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
  const todayDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
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
  }, [rows, accounts, hidingFuture]);

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ padding: 16 }}>
      <View className="mb-4 flex-row items-center justify-between">
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
      <CalendarMonthGrid period={period} currency={baseCurrency} expenseByDay={expenseByDay} />
    </ScrollView>
  );
}
