import { Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { formatMoney } from "../../services/format";

interface AllocationSlice {
  name: string;
  valueMinor: number;
  color: string;
}

interface AssetAllocationChartProps {
  data: AllocationSlice[];
  currency: string;
  size?: number;
}

// A donut built from stacked ring segments (each an SVG Circle stroked
// over only its share of the circumference) rather than floating labels
// around the outside like the real app's desktop chart — labels-on-the-
// arc don't have room on a phone-width screen, so the legend below carries
// the name+amount instead, which reads just as clearly at this size.
export function AssetAllocationChart({ data, currency, size = 180 }: AssetAllocationChartProps) {
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
      </View>
    </View>
  );
}
