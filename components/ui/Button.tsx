import type { ReactNode } from "react";
import { Pressable, Text, type PressableProps } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { GRADIENTS } from "../../theme/gradients";

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
  if (variant === "primary") {
    return (
      <Pressable className={className} disabled={disabled} {...props}>
        {({ pressed }) => (
          <LinearGradient
            colors={GRADIENTS.brand}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 9999,
              paddingVertical: 12,
              alignItems: "center",
              opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
              transform: [{ scale: pressed ? 0.96 : 1 }],
            }}
          >
            <Text className="text-base font-semibold text-white">{children}</Text>
          </LinearGradient>
        )}
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
