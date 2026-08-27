import { Text, View } from "react-native";

import { formatMoney } from "../services/format";

interface SummaryBandProps {
  incomeMinor: number;
  expenseMinor: number;
  currency: string;
}

export function SummaryBand({ incomeMinor, expenseMinor, currency }: SummaryBandProps) {
  const total = incomeMinor + expenseMinor;
  const incomePercent = total > 0 ? (incomeMinor / total) * 100 : 50;

  return (
    <View className="overflow-hidden rounded-lg border border-glass-border">
      <View className="h-1.5 flex-row">
        <View className="bg-success" style={{ width: `${incomePercent}%` }} />
        <View className="bg-danger" style={{ width: `${100 - incomePercent}%` }} />
      </View>
      <View className="flex-row justify-between px-4 py-3">
        <View>
          <Text className="text-xs text-fg-muted">Income</Text>
          <Text className="font-data font-medium tabular-nums text-success">
            {formatMoney(incomeMinor, currency)}
          </Text>
        </View>
        <View className="items-end">
          <Text className="text-xs text-fg-muted">Expense</Text>
          <Text className="font-data font-medium tabular-nums text-danger">
            {formatMoney(expenseMinor, currency)}
          </Text>
        </View>
      </View>
    </View>
  );
}
