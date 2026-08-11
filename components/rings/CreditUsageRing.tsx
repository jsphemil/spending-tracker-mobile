import { Text } from "react-native";

import { formatMoney } from "../../services/format";
import { RingArc } from "./RingArc";

interface CreditUsageRingProps {
  owedMinor: number;
  creditLimitMinor: number;
  currency: string;
  size?: number;
}

// Credit Card accounts get an entirely different ring from BalanceRing
// (spec.md §5.1): fill is % of the credit limit used, and the center
// figure is the net amount currently owed, not a period income/expense
// figure. Going over the limit triggers the same second warning lap.
export function CreditUsageRing({
  owedMinor,
  creditLimitMinor,
  currency,
  size = 180,
}: CreditUsageRingProps) {
  let percent: number;
  let overflowPercent = 0;
  if (creditLimitMinor <= 0) {
    percent = owedMinor > 0 ? 100 : 0;
    overflowPercent = owedMinor > 0 ? 100 : 0;
  } else {
    const ratio = (owedMinor / creditLimitMinor) * 100;
    percent = Math.max(0, Math.min(ratio, 100));
    overflowPercent = Math.max(0, Math.min(ratio - 100, 100));
  }

  const overLimit = creditLimitMinor > 0 && owedMinor > creditLimitMinor;

  return (
    <RingArc
      size={size}
      strokeWidth={16}
      trackColor="#E5E7EB"
      color="#F97316"
      percent={percent}
      overflowPercent={overflowPercent}
    >
      <Text className="text-xs text-gray-500">Owed</Text>
      <Text
        className={`text-lg font-semibold ${overLimit ? "text-red-600" : "text-gray-900"}`}
      >
        {formatMoney(owedMinor, currency)}
      </Text>
    </RingArc>
  );
}
