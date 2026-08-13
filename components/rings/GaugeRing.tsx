import { Text, View } from "react-native";

import { useThemeColors } from "../../theme/palette";
import { RingArc } from "./RingArc";

interface GaugeRingProps {
  /** 0-1 (or above 1 when overdrawn/overspent); null = no capacity to gauge against at all. */
  usedFraction: number | null;
  centerLabel: string;
  centerValue: string;
  /** "≈ {base currency}" line — only passed when the account's own currency differs from the app's live base currency. */
  centerEquivalent?: string;
  centerSubtext?: string;
  size?: number;
}

// A capacity gauge, not a flow-ratio pie: the ring's full circle represents
// what was available (carry forward + income, for the account/portfolio
// cases), the colored arc eats into it as "Used", and Available is
// whatever's left uncovered. Shared by the Dashboard's Net Worth ring and
// the Account Detail page's non-credit-card ring — CreditUsageRing stays
// its own component since it scales to a credit limit with different
// colors/labels, not this Used/Available split.
export function GaugeRing({
  usedFraction,
  centerLabel,
  centerValue,
  centerEquivalent,
  centerSubtext,
  size = 180,
}: GaugeRingProps) {
  const colors = useThemeColors();
  const percentUsed = usedFraction !== null ? Math.max(0, Math.min(100, usedFraction * 100)) : 0;
  const overflowPercent =
    usedFraction !== null ? Math.max(0, Math.min(usedFraction * 100 - 100, 100)) : 0;

  return (
    <View className="items-center gap-3">
      <RingArc
        size={size}
        strokeWidth={16}
        trackColor={colors.success}
        color={colors.danger}
        percent={percentUsed}
        overflowPercent={overflowPercent}
        overflowColor={colors.danger}
      >
        <Text className="text-xs text-fg-muted">{centerLabel}</Text>
        <Text className="font-data text-lg font-semibold tabular-nums text-fg">{centerValue}</Text>
        {centerEquivalent ? (
          <Text className="font-data text-xs tabular-nums text-fg-subtle">≈ {centerEquivalent}</Text>
        ) : null}
        {centerSubtext ? <Text className="text-xs text-fg-muted">{centerSubtext}</Text> : null}
      </RingArc>
      <View className="flex-row items-center gap-4">
        <View className="flex-row items-center gap-1.5">
          <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors.danger }} />
          <Text className="text-xs text-fg-muted">Used</Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors.success }} />
          <Text className="text-xs text-fg-muted">Available</Text>
        </View>
      </View>
    </View>
  );
}
