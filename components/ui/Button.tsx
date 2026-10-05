import type { ReactNode } from "react";
import { Pressable, Text, type PressableProps } from "react-native";

export type ButtonVariant = "primary" | "success" | "danger" | "transfer" | "ghost";

interface ButtonProps extends PressableProps {
  variant?: ButtonVariant;
  children: ReactNode;
}

// Tinted-glass tone treatment for success/danger/transfer — this app's
// Button doubles as both an action and a tone signal (e.g. a danger
// "Delete" button), which the Erebor spec's Badge component uses for
// exactly this pattern: tone color at low-alpha fill + full-strength text.
const TONE_BG: Record<"success" | "danger" | "transfer", string> = {
  success: "bg-success-soft",
  danger: "bg-danger-soft",
  transfer: "bg-transfer-soft",
};
const TONE_TEXT: Record<"success" | "danger" | "transfer", string> = {
  success: "text-success",
  danger: "text-danger",
  transfer: "text-transfer",
};

export function Button({ variant = "primary", children, className, disabled, ...props }: ButtonProps) {
  // V4 (spec.md §5.24): a solid accent fill — the brand gradient is gone.
  if (variant === "primary") {
    return (
      <Pressable
        className={`items-center rounded-full bg-accent py-3 active:opacity-85 ${disabled ? "opacity-50" : ""} ${className ?? ""}`}
        disabled={disabled}
        {...props}
      >
        <Text className="text-base font-semibold text-on-accent">{children}</Text>
      </Pressable>
    );
  }

  if (variant === "ghost") {
    return (
      <Pressable
        className={`items-center rounded-full border border-glass-border bg-transparent py-3 active:bg-glass ${disabled ? "opacity-50" : ""} ${className ?? ""}`}
        disabled={disabled}
        {...props}
      >
        <Text className="text-base font-semibold text-fg">{children}</Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      className={`items-center rounded-full py-3 ${TONE_BG[variant]} ${disabled ? "opacity-50" : ""} ${className ?? ""}`}
      disabled={disabled}
      {...props}
    >
      <Text className={`text-base font-semibold ${TONE_TEXT[variant]}`}>{children}</Text>
    </Pressable>
  );
}
