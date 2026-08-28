import type { ViewStyle } from "react-native";

// Stop arrays for expo-linear-gradient's `colors` prop — tokens/colors.css's
// --gradient-* values. Dark-only system, so these aren't scheme-dependent.
export const GRADIENTS = {
  brand: ["#48e7f5", "#4c7dff", "#6e5cff"],
  send: ["#ff9152", "#f857c1"],
  receive: ["#2fe39b", "#1fbf8f"],
  pay: ["#8b6cff", "#5b3fd9"],
  invest: ["#4c7dff", "#48e7f5"],
} as const;

export type GradientName = keyof typeof GRADIENTS;

// tokens/shadows.css's --glow-* — colored shadow, only ever used under a
// gradient-filled element (icon badges, primary buttons, active chart
// legends). Never combine two on one element. React Native has no `filter:
// drop-shadow`/box-shadow blur radius the way CSS does, so this is
// approximated via shadowColor/shadowOpacity/shadowRadius (iOS) — Android
// only honors shadowColor via `elevation`, which can't tint, so the glow is
// primarily an iOS-visible effect; harmless no-op tint on Android.
function glow(color: string): ViewStyle {
  return {
    shadowColor: color,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  };
}

export const GLOW_SHADOWS: Record<GradientName | "cyan" | "purple" | "pink", ViewStyle> = {
  brand: glow("#4c7dff"),
  send: glow("#ff9152"),
  receive: glow("#2fe39b"),
  pay: glow("#a855f7"),
  invest: glow("#48e7f5"),
  cyan: glow("#48e7f5"),
  purple: glow("#a855f7"),
  pink: glow("#f857c1"),
};

export const CARD_SHADOW: ViewStyle = {
  shadowColor: "#000000",
  shadowOpacity: 0.35,
  shadowRadius: 20,
  shadowOffset: { width: 0, height: 8 },
  elevation: 6,
};

export const NAV_SHADOW: ViewStyle = {
  shadowColor: "#000000",
  shadowOpacity: 0.45,
  shadowRadius: 24,
  shadowOffset: { width: 0, height: 12 },
  elevation: 10,
};
