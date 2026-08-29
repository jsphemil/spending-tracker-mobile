import type { ColorProp, HexColor } from "react-native-android-widget";

// Widget-specific color tokens. Not the same mechanism as theme/palette.ts
// (CSS variables via NativeWind) — RemoteViews needs literal color values
// baked into each of the two JSX trees handed to `renderWidget({light,
// dark})`, one per system theme.
//
// Revised 2026-08-29 to match a reference widget the user liked: a
// compact, translucent card that sits directly on the wallpaper rather
// than an opaque surface — `cardBg` is RGBA (real alpha over the
// wallpaper; RemoteViews has no blur, so this is the closest
// approximation) instead of a solid hex fill. Dark values are a
// translucent version of theme/palette.ts's own dark palette; light
// values are a translucent version of the earlier Claude Design
// mockup's light palette (the app itself has no light theme to draw
// from — dark-only since the Erebor redesign).
export interface WidgetColors {
  cardBg: ColorProp;
  border: HexColor;
  dividerStrong: HexColor;
  textPrimary: HexColor;
  textSecondary: HexColor;
}

export const WIDGET_LIGHT: WidgetColors = {
  cardBg: "rgba(255, 255, 255, 0.88)",
  border: "#e4e8f0",
  dividerStrong: "#d7dce6",
  textPrimary: "#12172a",
  textSecondary: "#5b6478",
};

export const WIDGET_DARK: WidgetColors = {
  cardBg: "rgba(12, 17, 32, 0.82)",
  border: "#1f2432",
  dividerStrong: "#2e323f",
  textPrimary: "#f6f8fc",
  textSecondary: "#97a1bc",
};

// Fixed brand accents — same in both themes, matching
// theme/gradients.ts's GRADIENTS.brand stops and the confirmed mockup's
// "one fixed accent per action across both themes" note.
export const WIDGET_ACCENT: Record<"cyan" | "blue" | "violet", HexColor> = {
  cyan: "#48e7f5",
  blue: "#4c7dff",
  violet: "#6e5cff",
};

// Icon stroke color on the bright accent badges — fixed dark for
// contrast in both themes, matching the mockup.
export const WIDGET_ICON_STROKE: HexColor = "#0a0e1a";
