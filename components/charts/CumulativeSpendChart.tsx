import { Text, View } from "react-native";
import Svg, { Line, Path } from "react-native-svg";

import { monotoneCubicPath, niceCeiling } from "../../services/chartPath";
import { spendGapAtDay } from "../../services/cumulativeSpend";
import { formatCompactMoney, formatMoney } from "../../services/format";
import { useThemeColors } from "../../theme/palette";

interface CumulativeSpendChartProps {
  thisMonth: number[]; // running totals, one per day, base-currency minor
  lastMonth: number[];
  currency: string;
  // Day of month to mark as "today" — only when the viewed month is the
  // current one; undefined otherwise.
  today?: number;
  height?: number;
}

const VIEW_WIDTH = 320;
const GRID_LINES = 4;
const LEFT_PADDING = 44;
const RIGHT_PADDING = 8;
const TOP_PADDING = 8;
const BOTTOM_PADDING = 20;

// Two running-total lines on the same day-of-month axis (spec.md §5.22):
// this month in the danger tone, last month dashed and muted, so the eye
// reads "am I ahead of or behind last month's pace?" — the one question a
// per-day view answers that the monthly total can't. Same viewBox grid as
// NetWorthTrendChart. The this-month line stops at today when the viewed
// month is the current one; drawing it flat to the month's end would
// read as "no more spending coming".
export function CumulativeSpendChart({ thisMonth, lastMonth, currency, today, height = 160 }: CumulativeSpendChartProps) {
  const colors = useThemeColors();
  const plotWidth = VIEW_WIDTH - LEFT_PADDING - RIGHT_PADDING;
  const plotHeight = height - TOP_PADDING - BOTTOM_PADDING;
  const days = Math.max(thisMonth.length, lastMonth.length, 1);

  const maxValue = Math.max(0, ...thisMonth, ...lastMonth);
  const ceiling = niceCeiling(maxValue);

  const toPoint = (value: number, dayIndex: number) => ({
    x: LEFT_PADDING + (days === 1 ? plotWidth / 2 : (dayIndex / (days - 1)) * plotWidth),
    y: ceiling > 0 ? TOP_PADDING + plotHeight - (value / ceiling) * plotHeight : TOP_PADDING + plotHeight,
  });

  const thisMonthShown = today != null ? thisMonth.slice(0, Math.min(today, thisMonth.length)) : thisMonth;
  const thisPath = monotoneCubicPath(thisMonthShown.map(toPoint));
  const lastPath = monotoneCubicPath(lastMonth.map(toPoint));
  const todayX = today != null ? toPoint(0, Math.min(today, days) - 1).x : null;

  const compareDay = today ?? days;
  const gap = spendGapAtDay(thisMonth, lastMonth, compareDay);

  return (
    <View>
      <Svg width="100%" height={height} viewBox={`0 0 ${VIEW_WIDTH} ${height}`}>
        {Array.from({ length: GRID_LINES + 1 }, (_, i) => {
          const y = TOP_PADDING + plotHeight * (1 - i / GRID_LINES);
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
        {todayX != null && (
          <Line
            x1={todayX}
            y1={TOP_PADDING}
            x2={todayX}
            y2={TOP_PADDING + plotHeight}
            stroke={colors.fgSubtle}
            strokeWidth={1}
            strokeDasharray="3,3"
          />
        )}
        {lastMonth.length > 1 && (
          <Path d={lastPath} fill="none" stroke={colors.fgSubtle} strokeWidth={1.5} strokeDasharray="4,4" />
        )}
        {thisMonthShown.length > 1 && (
          <Path d={thisPath} fill="none" stroke={colors.danger} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        )}
      </Svg>

      <View style={{ position: "absolute", left: 0, top: TOP_PADDING - 6 }}>
        {Array.from({ length: GRID_LINES + 1 }, (_, i) => (
          <Text key={i} className="text-[10px] text-fg-subtle" style={{ height: plotHeight / GRID_LINES }}>
            {formatCompactMoney(ceiling * (1 - i / GRID_LINES), currency)}
          </Text>
        ))}
      </View>

      <View className="mt-1 flex-row justify-between px-1">
        <Text className="text-[10px] text-fg-subtle">Day 1</Text>
        <Text className="text-[10px] text-fg-subtle">Day {days}</Text>
      </View>

      <View className="mt-2 flex-row items-center gap-4">
        <LegendSwatch color={colors.danger} label="This month" />
        <LegendSwatch color={colors.fgSubtle} label="Last month" dashed />
      </View>
      <Text className="mt-2 text-xs text-fg-muted">
        {gap === 0
          ? `Level with last month${today != null ? " at this point" : ""}.`
          : `${formatMoney(Math.abs(gap), currency)} ${gap > 0 ? "more" : "less"} than last month${
              today != null ? " at this point" : ""
            }.`}
      </Text>
    </View>
  );
}

function LegendSwatch({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <View
        style={{
          width: 14,
          height: 0,
          borderTopWidth: 2,
          borderColor: color,
          borderStyle: dashed ? "dashed" : "solid",
        }}
      />
      <Text className="text-[10px] text-fg-subtle">{label}</Text>
    </View>
  );
}
