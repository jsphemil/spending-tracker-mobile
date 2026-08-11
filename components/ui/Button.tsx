import type { ReactNode } from "react";
import { Pressable, Text, type PressableProps } from "react-native";

export type ButtonVariant = "primary" | "success" | "danger" | "transfer" | "ghost";

interface ButtonProps extends PressableProps {
  variant?: ButtonVariant;
  children: ReactNode;
}

const FILLED_BG: Record<Exclude<ButtonVariant, "ghost">, string> = {
  primary: "bg-accent",
  success: "bg-success",
  danger: "bg-danger",
  transfer: "bg-transfer",
};

export function Button({ variant = "primary", children, className, ...props }: ButtonProps) {
  const isGhost = variant === "ghost";
  return (
    <Pressable
      className={`items-center rounded-lg py-3 ${
        isGhost ? "border border-border bg-transparent" : FILLED_BG[variant]
      } ${className ?? ""}`}
      {...props}
    >
      <Text
        className={`text-base font-semibold ${isGhost ? "text-fg" : "text-white"}`}
      >
        {children}
      </Text>
    </Pressable>
  );
}
