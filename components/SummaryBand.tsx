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
      <View className="flex-1 items-center bg-success-soft py-2">
        <Text className="text-xs text-success">Income</Text>
        <Text className="font-data font-semibold tabular-nums text-success">
          {formatMoney(incomeMinor, currency)}
        </Text>
      </View>
      <View className="flex-1 items-center bg-danger-soft py-2">
        <Text className="text-xs text-danger">Expense</Text>
        <Text className="font-data font-semibold tabular-nums text-danger">
          {formatMoney(expenseMinor, currency)}
        </Text>
      </View>
    </View>
  );
}
