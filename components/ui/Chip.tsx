import type { ReactNode } from "react";
import { Pressable, Text } from "react-native";

export type ChipTone = "accent" | "transfer";

const TONE_SELECTED: Record<ChipTone, string> = {
  accent: "border-accent bg-accent-soft",
  transfer: "border-transfer bg-transfer-soft",
};
const TONE_TEXT: Record<ChipTone, string> = {
  accent: "text-accent",
  transfer: "text-transfer",
};

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  tone?: ChipTone;
  role?: "radio" | "checkbox";
  icon?: ReactNode;
}

// The selected/unselected pill convention already repeated by hand in every
// form (Type/Color/Currency/Tag rows): `border-accent bg-accent-soft
// text-accent` selected vs `border-glass-border bg-glass text-fg-muted`
// otherwise. Extracted here so the New Transaction redesign's new chip
// rows (account/category-more/fund sheets) share one definition instead of
// adding a 5th copy — existing chip rows elsewhere are left as they are.
export function Chip({ label, selected, onPress, tone = "accent", role = "radio", icon }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={role}
      accessibilityState={role === "radio" ? { selected } : { checked: selected }}
      className={`flex-row items-center gap-1.5 rounded-full border px-3 py-2 ${
        selected ? TONE_SELECTED[tone] : "border-glass-border bg-glass"
      }`}
    >
      {icon}
      <Text className={selected ? TONE_TEXT[tone] : "text-fg-muted"}>{label}</Text>
    </Pressable>
  );
}
