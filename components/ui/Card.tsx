import type { ReactNode } from "react";
import { View, type ViewProps } from "react-native";

import { CARD_SHADOW } from "../../theme/gradients";

interface CardProps extends ViewProps {
  children: ReactNode;
}

// The one repeated container shape used across every screen — rounded
// corners, border, surface-color background, consistent padding (spec.md
// §5.12 / knowledge-transfer.md §4.4's "one repeated card primitive").
// Erebor design refresh: glass panel — translucent fill + hairline border +
// drop shadow, approximating frosted glass without a real blur dependency
// (see the design-refresh plan's "glass = translucent fills only" call).
export function Card({ children, className, style, ...props }: CardProps) {
  return (
    <View
      className={`rounded-card border border-glass-border bg-glass p-4 ${className ?? ""}`}
      style={[CARD_SHADOW, style]}
      {...props}
    >
      {children}
    </View>
  );
}
