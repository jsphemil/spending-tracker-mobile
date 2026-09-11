import { Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { formatMoney } from "../../services/format";
import { useThemeColors } from "../../theme/palette";

interface AllocationSlice {
  name: string;
  valueMinor: number;
  color: string;
}

interface AssetAllocationChartProps {
  data: AllocationSlice[];
  currency: string;
  size?: number;
  // Total held in open funds (spec.md §5.22). When given, a thin inner arc
  // shows what share of these assets is already spoken for, with its own
  // legend row. It cuts *across* the slices — funds aren't tied to an
  // account type — which is why it is a separate inner ring and not a
  // slice of the outer one.
  earmarkedMinor?: number;
}

// A donut built from stacked ring segments (each an SVG Circle stroked
// over only its share of the circumference) rather than floating labels
// around the outside like the real app's desktop chart — labels-on-the-
// arc don't have room on a phone-width screen, so the legend below carries
// the name+amount instead, which reads just as clearly at this size.
export function AssetAllocationChart({ data, currency, size = 180, earmarkedMinor }: AssetAllocationChartProps) {
  const colors = useThemeColors();
  const total = data.reduce((sum, d) => sum + d.valueMinor, 0);
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulativeFraction = 0;
  const segments = data.map((slice) => {
    const fraction = total > 0 ? slice.valueMinor / total : 0;
    const segment = {
      ...slice,
      dasharray: `${fraction * circumference} ${circumference}`,
      dashoffset: -cumulativeFraction * circumference,
    };
    // A render-local running total: declared inside this component, reset on
    // every render, and only ever advanced synchronously inside this map, so
    // it never escapes the render pass. The rule guards against partial
    // memoization under React Compiler, which this project doesn't enable
    // (reactCompiler: false in the Metro config) — revisit if that changes.
    // eslint-disable-next-line react-hooks/immutability
    cumulativeFraction += fraction;
    return segment;
  });

  const showEarmarked = earmarkedMinor != null && earmarkedMinor > 0 && total > 0;
  const earmarkedFraction = showEarmarked ? Math.min(earmarkedMinor / total, 1) : 0;
  const overEarmarked = showEarmarked && earmarkedMinor > total;
  const innerStroke = 6;
  const innerRadius = radius - strokeWidth / 2 - innerStroke;
  const innerCircumference = 2 * Math.PI * innerRadius;

  return (
    <View className="items-center gap-4">
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          {segments.map((segment, i) => (
            <Circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={segment.color}
              strokeWidth={strokeWidth}
              strokeDasharray={segment.dasharray}
              strokeDashoffset={segment.dashoffset}
              fill="none"
              rotation={-90}
              origin={`${size / 2}, ${size / 2}`}
            />
          ))}
          {showEarmarked && (
            <>
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={innerRadius}
                stroke={colors.border}
                strokeWidth={innerStroke}
                fill="none"
              />
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={innerRadius}
                stroke={colors.accent}
                strokeWidth={innerStroke}
                strokeDasharray={`${earmarkedFraction * innerCircumference} ${innerCircumference}`}
                strokeLinecap={earmarkedFraction < 1 ? "round" : "butt"}
                fill="none"
                rotation={-90}
                origin={`${size / 2}, ${size / 2}`}
              />
            </>
          )}
        </Svg>
      </View>
      <View className="w-full gap-2">
        {data.map((slice) => (
          <View key={slice.name} className="flex-row items-center justify-between gap-2">
            <View className="flex-1 flex-row items-center gap-2">
              <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: slice.color }} />
              <Text className="flex-1 text-xs text-fg-muted">{slice.name}</Text>
            </View>
            <Text className="font-data text-xs font-medium tabular-nums text-fg">
              {formatMoney(slice.valueMinor, currency)}
            </Text>
          </View>
        ))}
        {showEarmarked && (
          <View className="mt-1 flex-row items-center justify-between gap-2 border-t border-glass-border pt-2">
            <View className="flex-1 flex-row items-center gap-2">
              <View className="h-2.5 w-2.5 rounded-full border-2" style={{ borderColor: colors.accent }} />
              <Text className="flex-1 text-xs text-fg-muted">
                Earmarked in funds
                {overEarmarked
                  ? " — more than your assets"
                  : ` — ${Math.round(earmarkedFraction * 100)}% of assets`}
              </Text>
            </View>
            <Text className="font-data text-xs font-medium tabular-nums text-accent">
              {formatMoney(earmarkedMinor, currency)}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
