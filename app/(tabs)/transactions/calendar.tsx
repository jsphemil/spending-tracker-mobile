import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { CalendarMonthGrid } from "../../../components/CalendarMonthGrid";
import { db } from "../../../db/client";
import { useAccounts } from "../../../db/queries/accounts";
import { useSettings } from "../../../db/queries/settings";
import { useFilteredTransactions } from "../../../db/queries/transactions";
import { currentMonthPeriod, monthLabel, monthRange, shiftMonth } from "../../../services/period";
import { ensureMaterialized } from "../../../services/recurrence";

export default function TransactionsCalendarScreen() {
  const { settings } = useSettings();
  const baseCurrency = settings?.baseCurrency ?? "INR";
  const [period, setPeriod] = useState(currentMonthPeriod());
  const range = useMemo(() => monthRange(period), [period]);
  useEffect(() => {
    ensureMaterialized(db, { through: range.end });
  }, [range.end]);
  const { data: rows } = useFilteredTransactions({ range });
  const { data: accounts } = useAccounts();

  // Day totals only include base-currency accounts — summing raw amounts
  // across different currencies without conversion would be silently wrong.
  const expenseByDay = useMemo(() => {
    const totals: Record<number, number> = {};
    const currencyByAccount = new Map((accounts ?? []).map((a) => [a.id, a.currency]));
    for (const row of rows ?? []) {
      if (row.type !== "expense") continue;
      if (currencyByAccount.get(row.accountId) !== baseCurrency) continue;
      const day = row.date.getDate();
      totals[day] = (totals[day] ?? 0) + row.amountMinor;
    }
    return totals;
  }, [rows, accounts]);

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ padding: 16 }}>
      <View className="mb-4 flex-row items-center justify-between">
        <Pressable
          onPress={() => setPeriod((p) => shiftMonth(p, -1))}
          className="p-3"
          hitSlop={8}
        >
          <Text className="text-xl text-fg">‹</Text>
        </Pressable>
        <Text className="text-base font-medium text-fg">{monthLabel(period)}</Text>
        <Pressable
          onPress={() => setPeriod((p) => shiftMonth(p, 1))}
          className="p-3"
          hitSlop={8}
        >
          <Text className="text-xl text-fg">›</Text>
        </Pressable>
      </View>
      <CalendarMonthGrid period={period} currency={baseCurrency} expenseByDay={expenseByDay} />
    </ScrollView>
  );
}
