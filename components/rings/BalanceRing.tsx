import { Text, View } from "react-native";

import { formatMoney } from "../../services/format";
import { RingArc } from "./RingArc";

interface BalanceRingProps {
  incomeMinor: number;
  expenseMinor: number;
  currency: string;
  size?: number;
}

// Regular accounts + Dashboard: the ring reads as "how much of this
// period's income have I spent". Fill is expense as a % of income, so
// spending exactly your income fills the ring; spending past it starts a
// second warning lap (spec.md §5.1's "second warning lap" behavior).
export function BalanceRing({
  incomeMinor,
  expenseMinor,
  currency,
  size = 180,
}: BalanceRingProps) {
  const netMinor = incomeMinor - expenseMinor;

  let percent: number;
  let overflowPercent = 0;
  if (incomeMinor <= 0) {
    percent = expenseMinor > 0 ? 100 : 0;
    overflowPercent = expenseMinor > 0 ? 100 : 0;
  } else {
    const ratio = (expenseMinor / incomeMinor) * 100;
    percent = Math.min(ratio, 100);
    overflowPercent = Math.max(0, Math.min(ratio - 100, 100));
  }

  return (
    <RingArc
      size={size}
      strokeWidth={16}
      trackColor="#E5E7EB"
      color="#3B82F6"
      percent={percent}
      overflowPercent={overflowPercent}
    >
      <Text className="text-xs text-gray-500">Net</Text>
      <Text
        className={`text-lg font-semibold ${netMinor < 0 ? "text-red-600" : "text-gray-900"}`}
      >
        {formatMoney(netMinor, currency)}
      </Text>
    </RingArc>
  );
}
