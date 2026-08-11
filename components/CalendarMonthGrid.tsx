import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { formatMoney } from "../services/format";
import { toLocalDateString, type MonthPeriod } from "../services/period";

interface CalendarMonthGridProps {
  period: MonthPeriod;
  currency: string;
  /** Total expense minor units per day-of-month (1-31). */
  expenseByDay: Record<number, number>;
}

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

export function CalendarMonthGrid({ period, currency, expenseByDay }: CalendarMonthGridProps) {
  const { year, month } = period;
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <View>
      <View className="flex-row">
        {WEEKDAY_LABELS.map((label, i) => (
          <View key={i} className="flex-1 items-center py-1">
            <Text className="text-xs text-gray-400">{label}</Text>
          </View>
        ))}
      </View>
      <View className="flex-row flex-wrap">
        {cells.map((day, i) => {
          if (day === null) return <View key={i} style={{ width: `${100 / 7}%` }} className="p-1" />;
          const expense = expenseByDay[day];
          const dateStr = toLocalDateString(new Date(year, month, day));
          return (
            <View key={i} style={{ width: `${100 / 7}%` }} className="p-1">
              <Link href={`/transaction/new?date=${dateStr}`} asChild>
                <Pressable className="aspect-square items-center justify-center rounded-lg border border-gray-100">
                  <Text className="text-sm text-gray-900">{day}</Text>
                  {expense ? (
                    <Text className="text-[10px] text-red-600" numberOfLines={1}>
                      {formatMoney(expense, currency)}
                    </Text>
                  ) : null}
                </Pressable>
              </Link>
            </View>
          );
        })}
      </View>
    </View>
  );
}
