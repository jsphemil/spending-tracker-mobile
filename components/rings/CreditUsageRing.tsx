import { Text } from "react-native";

import { formatMoney } from "../../services/format";
import { useThemeColors } from "../../theme/palette";
import { RingArc } from "./RingArc";

interface CreditUsageRingProps {
  owedMinor: number;
  creditLimitMinor: number;
  currency: string;
  /** "≈ {base currency}" line — only passed when the account's own currency differs from the app's live base currency. */
  owedEquivalent?: string;
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
  owedEquivalent,
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
  const colors = useThemeColors();

  return (
    <RingArc
      size={size}
      strokeWidth={16}
      trackColor={colors.surface3}
      color={colors.transfer}
      percent={percent}
      overflowPercent={overflowPercent}
      overflowColor={colors.danger}
    >
      <Text className="text-xs text-fg-muted">Owed</Text>
      <Text
        className={`font-display-xbold text-xl tabular-nums ${overLimit ? "text-danger" : "text-fg"}`}
      >
        {formatMoney(owedMinor, currency)}
      </Text>
      {owedEquivalent ? (
        <Text className="font-data text-xs tabular-nums text-fg-subtle">≈ {owedEquivalent}</Text>
      ) : null}
    </RingArc>
  );
}
