import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { CalendarMonthGrid } from "../../../components/CalendarMonthGrid";
import { useAccounts } from "../../../db/queries/accounts";
import { useFilteredTransactions } from "../../../db/queries/transactions";
import { currentMonthPeriod, monthLabel, monthRange, shiftMonth } from "../../../services/period";

const BASE_CURRENCY = "INR";

export default function TransactionsCalendarScreen() {
  const [period, setPeriod] = useState(currentMonthPeriod());
  const range = useMemo(() => monthRange(period), [period]);
  const { data: rows } = useFilteredTransactions({ range });
  const { data: accounts } = useAccounts();

  // Day totals only include base-currency accounts — summing raw amounts
  // across different currencies without conversion would be silently wrong.
  const expenseByDay = useMemo(() => {
    const totals: Record<number, number> = {};
    const currencyByAccount = new Map((accounts ?? []).map((a) => [a.id, a.currency]));
    for (const row of rows ?? []) {
      if (row.type !== "expense") continue;
      if (currencyByAccount.get(row.accountId) !== BASE_CURRENCY) continue;
      const day = row.date.getDate();
      totals[day] = (totals[day] ?? 0) + row.amountMinor;
    }
    return totals;
  }, [rows, accounts]);

  return (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 16 }}>
      <View className="mb-4 flex-row items-center justify-between">
        <Pressable onPress={() => setPeriod((p) => shiftMonth(p, -1))} className="p-2">
          <Text className="text-lg">‹</Text>
        </Pressable>
        <Text className="text-base font-medium text-gray-900">{monthLabel(period)}</Text>
        <Pressable onPress={() => setPeriod((p) => shiftMonth(p, 1))} className="p-2">
          <Text className="text-lg">›</Text>
        </Pressable>
      </View>
      <CalendarMonthGrid period={period} currency={BASE_CURRENCY} expenseByDay={expenseByDay} />
    </ScrollView>
  );
}
