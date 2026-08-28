import { Text, View } from "react-native";

import { formatMoney } from "../../services/format";
import { useThemeColors } from "../../theme/palette";
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
  const colors = useThemeColors();

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
      trackColor={colors.surface3}
      color={colors.accent}
      percent={percent}
      overflowPercent={overflowPercent}
    >
      <Text className="text-xs text-fg-muted">Net</Text>
      <Text
        className={`font-display-xbold text-xl tabular-nums ${netMinor < 0 ? "text-danger" : "text-fg"}`}
      >
        {formatMoney(netMinor, currency)}
      </Text>
    </RingArc>
  );
}
