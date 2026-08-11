import { Text, View } from "react-native";

import { formatMoney } from "../services/format";

interface SummaryBandProps {
  incomeMinor: number;
  expenseMinor: number;
  currency: string;
}

export function SummaryBand({ incomeMinor, expenseMinor, currency }: SummaryBandProps) {
  return (
    <View className="flex-row overflow-hidden rounded-lg">
      <View className="flex-1 items-center bg-green-100 py-2">
        <Text className="text-xs text-green-700">Income</Text>
        <Text className="font-semibold text-green-700">
          {formatMoney(incomeMinor, currency)}
        </Text>
      </View>
      <View className="flex-1 items-center bg-red-100 py-2">
        <Text className="text-xs text-red-700">Expense</Text>
        <Text className="font-semibold text-red-700">
          {formatMoney(expenseMinor, currency)}
        </Text>
      </View>
    </View>
  );
}
