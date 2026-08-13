import { Text, View } from "react-native";
import Svg, { Circle, Line, Polyline } from "react-native-svg";

import { formatCompactMoney } from "../../services/format";
import { useThemeColors } from "../../theme/palette";

interface NetWorthTrendChartProps {
  data: { label: string; valueMinor: number }[];
  currency: string;
  height?: number;
}

const VIEW_WIDTH = 320;
const GRID_LINES = 4;
const LEFT_PADDING = 44;
const RIGHT_PADDING = 8;
const TOP_PADDING = 8;
const BOTTOM_PADDING = 20;

// A simple line chart over an SVG viewBox (so it scales to whatever width
// its parent gives it via width="100%", no onLayout measurement needed).
// Y-axis rounds up to a "nice" ceiling above the largest value so gridlines
// land on round compact numbers (₹14L, ₹10.5L, ...), matching the real
// app's chart. A single data point (e.g. a brand-new profile with only
// this month's history) still renders as one dot, no line.
export function NetWorthTrendChart({ data, currency, height = 180 }: NetWorthTrendChartProps) {
  const colors = useThemeColors();
  const plotWidth = VIEW_WIDTH - LEFT_PADDING - RIGHT_PADDING;
  const plotHeight = height - TOP_PADDING - BOTTOM_PADDING;

  const maxValue = Math.max(0, ...data.map((d) => d.valueMinor));
  const ceiling = niceCeiling(maxValue);

  const points = data.map((d, i) => {
    const x =
      data.length === 1
        ? LEFT_PADDING + plotWidth / 2
        : LEFT_PADDING + (i / (data.length - 1)) * plotWidth;
    const y =
      ceiling > 0
        ? TOP_PADDING + plotHeight - (d.valueMinor / ceiling) * plotHeight
        : TOP_PADDING + plotHeight;
    return { x, y };
  });

  return (
    <View>
      <Svg width="100%" height={height} viewBox={`0 0 ${VIEW_WIDTH} ${height}`}>
        {Array.from({ length: GRID_LINES + 1 }, (_, i) => {
          const fraction = i / GRID_LINES;
          const y = TOP_PADDING + plotHeight * (1 - fraction);
          return (
            <Line
              key={i}
              x1={LEFT_PADDING}
              y1={y}
              x2={VIEW_WIDTH - RIGHT_PADDING}
              y2={y}
              stroke={colors.border}
              strokeWidth={1}
              strokeDasharray="2,3"
            />
          );
        })}

        {points.length > 1 && (
          <Polyline
            points={points.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke={colors.accent}
            strokeWidth={2}
          />
        )}
        {points.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={4} fill={colors.accent} />
        ))}
      </Svg>

      <View style={{ position: "absolute", left: 0, top: TOP_PADDING - 6 }}>
        {Array.from({ length: GRID_LINES + 1 }, (_, i) => {
          const fraction = 1 - i / GRID_LINES;
          return (
            <Text key={i} className="text-[10px] text-fg-subtle" style={{ height: plotHeight / GRID_LINES }}>
              {formatCompactMoney(ceiling * fraction, currency)}
            </Text>
          );
        })}
      </View>

      <View className="mt-1 flex-row justify-between px-1">
        <Text className="text-[10px] text-fg-subtle">{data[0]?.label ?? ""}</Text>
        {data.length > 1 && (
          <Text className="text-[10px] text-fg-subtle">{data[data.length - 1].label}</Text>
        )}
      </View>
    </View>
  );
}

// Rounds a value up to a "nice" number for the axis ceiling (1/2/5 × a
// power of 10) so gridlines land on readable figures instead of an
// arbitrary max like ₹12,04,549.
function niceCeiling(value: number): number {
  if (value <= 0) return 0;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const niceNormalized = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return niceNormalized * magnitude;
}
