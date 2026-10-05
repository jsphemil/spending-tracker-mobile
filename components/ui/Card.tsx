import type { ReactNode } from "react";
import { View, type ViewProps } from "react-native";

interface CardProps extends ViewProps {
  children: ReactNode;
}

// The one repeated container shape used across every screen — rounded
// corners, border, surface-color background, consistent padding (spec.md
// §5.12 / knowledge-transfer.md §4.4's "one repeated card primitive").
// V4 (spec.md §5.24): a subtle surface and hairline border, no shadow —
// grouping comes from spacing and contrast, not depth.
export function Card({ children, className, style, ...props }: CardProps) {
  return (
    <View
      className={`rounded-card border border-glass-border bg-glass p-4 ${className ?? ""}`}
      style={style}
      {...props}
    >
      {children}
    </View>
  );
}
