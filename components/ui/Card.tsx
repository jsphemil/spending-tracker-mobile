import type { ReactNode } from "react";
import { View, type ViewProps } from "react-native";

interface CardProps extends ViewProps {
  children: ReactNode;
}

// The one repeated container shape used across every screen — rounded
// corners, border, surface-color background, consistent padding (spec.md
// §5.12 / knowledge-transfer.md §4.4's "one repeated card primitive").
// Not present as a literal shared component in the source web app either
// (it only repeats the same Tailwind classes inline) — this exists here
// because RN benefits more from a shared component than web/Tailwind's
// class repetition does; the rendered values match the source exactly.
export function Card({ children, className, ...props }: CardProps) {
  return (
    <View
      className={`rounded-2xl border border-border bg-surface p-4 ${className ?? ""}`}
      {...props}
    >
      {children}
    </View>
  );
}
