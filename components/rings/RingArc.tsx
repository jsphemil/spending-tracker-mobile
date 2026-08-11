import type { ReactNode } from "react";
import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";

interface RingArcProps {
  size: number;
  strokeWidth: number;
  trackColor: string;
  color: string;
  /** 0-100. Fill of the primary ring. */
  percent: number;
  /**
   * 0-100. When overspending/over-limit pushes fill past 100%, this draws a
   * second, slightly-inset ring lap in a warning color rather than hiding
   * the first lap.
   */
  overflowPercent?: number;
  overflowColor?: string;
  children?: ReactNode;
}

export function RingArc({
  size,
  strokeWidth,
  trackColor,
  color,
  percent,
  overflowPercent = 0,
  overflowColor = "#DC2626",
  children,
}: RingArcProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedPercent = Math.max(0, Math.min(100, percent));
  const dashOffset = circumference * (1 - clampedPercent / 100);

  const overflowRadius = radius - strokeWidth - 2;
  const overflowCircumference = 2 * Math.PI * overflowRadius;
  const clampedOverflow = Math.max(0, Math.min(100, overflowPercent));
  const overflowDashOffset = overflowCircumference * (1 - clampedOverflow / 100);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          fill="none"
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
        {clampedOverflow > 0 && (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={overflowRadius}
            stroke={overflowColor}
            strokeWidth={strokeWidth / 2}
            strokeDasharray={overflowCircumference}
            strokeDashoffset={overflowDashOffset}
            strokeLinecap="round"
            fill="none"
            rotation={-90}
            origin={`${size / 2}, ${size / 2}`}
          />
        )}
      </Svg>
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {children}
      </View>
    </View>
  );
}
