import { useColorScheme } from "react-native";

import { useSettings } from "../db/queries/settings";

// The semantic colour roles (DESIGN.md §4). Mirrored into CSS variables by
// cssVars() below for className consumers; read directly by the handful
// that can't take a className (react-native-svg props, icon `color`).
// global.css carries the same values as a pre-settings fallback — keep the
// two in sync by hand.
//
// V4 (spec.md §5.24): Octet blue — vivid #0D51FB on soft neutrals, replacing the
// neon-cyan dark / saturated-purple light pair. Every text-bearing role
// below clears WCAG AA (4.5:1) against bg, surface and surface2 in its
// own theme — re-check if you change a value.
export interface ThemeColors {
  bg: string;
  surface: string;
  surface2: string;
  surface3: string;
  border: string;
  borderStrong: string;
  fg: string;
  fgMuted: string;
  fgSubtle: string;
  // Primary as text and icons: links, selected navigation, key controls.
  accent: string;
  accentStrong: string;
  // Primary as a solid fill (buttons, the +, progress). Same as `accent` in
  // Light; in Dark the vivid blue only works as a fill.
  accentFill: string;
  // Text/icons drawn on accentFill.
  onAccent: string;
  // Financial semantics: income/gains, expenses/debt/destructive.
  success: string;
  danger: string;
  // Something needs attention — not a money direction.
  warning: string;
  // Money moving between the user's own accounts: neither good nor bad.
  transfer: string;
  // Categorical chart series, for charts that compare parts (allocation).
  chart1: string;
  chart2: string;
  chart3: string;
  // Panel tiers. Names kept from the glass era so no screen changes, but
  // these are now plain subtle fills, not translucent "glass".
  glassFill: string;
  glassFillStrong: string;
  glassFillPress: string;
  glassBorder: string;
  glassBorderStrong: string;
}

export const palette: Record<"light" | "dark", ThemeColors> = {
  // Octet blue (chosen 2026-10-05): soft grey page, white surfaces, vivid
  // #0D51FB as both the text accent and the fill.
  light: {
    bg: "#f4f4f5",
    surface: "#ffffff",
    surface2: "#ededee",
    surface3: "#e3e3e5",
    border: "#e3e3e5",
    borderStrong: "#c9c9cc",
    fg: "#1f1f1f",
    fgMuted: "#656567",
    fgSubtle: "#656567",
    accent: "#0d51fb",
    accentStrong: "#103693",
    accentFill: "#0d51fb",
    onAccent: "#ffffff",
    success: "#2b7a57",
    danger: "#b03f4c",
    warning: "#94600f",
    transfer: "#6a5f88",
    chart1: "#0d51fb",
    chart2: "#b07a2a",
    chart3: "#3f8a8c",
    glassFill: "#ffffff",
    glassFillStrong: "rgba(31, 31, 31, 0.05)",
    glassFillPress: "rgba(31, 31, 31, 0.08)",
    glassBorder: "rgba(31, 31, 31, 0.08)",
    glassBorderStrong: "rgba(31, 31, 31, 0.14)",
  },
  // Black Metal page, Umbra surfaces, Jet Black dividers. #0D51FB is a fill
  // only here (white on it is 5.9:1); as text on near-black it is just
  // 3.5:1, so blue text and icons use the lighter #5C8DFF (6.5:1).
  dark: {
    bg: "#050505",
    surface: "#1f1f1f",
    surface2: "#2a2a2c",
    surface3: "#343537",
    border: "#2a2a2c",
    borderStrong: "#343537",
    fg: "#f2f2f3",
    fgMuted: "#a9a9ac",
    fgSubtle: "#8e8e91",
    accent: "#5c8dff",
    accentStrong: "#8aacff",
    accentFill: "#0d51fb",
    onAccent: "#ffffff",
    success: "#7fc6a2",
    danger: "#e8909a",
    warning: "#dbb46c",
    transfer: "#b6abd4",
    chart1: "#5c8dff",
    chart2: "#dbb46c",
    chart3: "#7fbfc0",
    glassFill: "rgba(255, 255, 255, 0.05)",
    glassFillStrong: "rgba(255, 255, 255, 0.08)",
    glassFillPress: "rgba(255, 255, 255, 0.11)",
    glassBorder: "rgba(255, 255, 255, 0.08)",
    glassBorderStrong: "rgba(255, 255, 255, 0.14)",
  },
};

// Soft (pre-alpha'd) container tints — the "Positive/Negative/Warning
// Container" roles. Separate from `palette` since they're rgba() strings,
// only needed by the CSS-variable path.
type SoftKey = "accentSoft" | "successSoft" | "dangerSoft" | "warningSoft" | "transferSoft";
const SOFT: Record<"light" | "dark", Record<SoftKey, string>> = {
  light: {
    accentSoft: "rgba(13, 81, 251, 0.08)",
    successSoft: "rgba(43, 122, 87, 0.10)",
    dangerSoft: "rgba(176, 63, 76, 0.09)",
    warningSoft: "rgba(148, 96, 15, 0.10)",
    transferSoft: "rgba(106, 95, 136, 0.10)",
  },
  dark: {
    accentSoft: "rgba(92, 141, 255, 0.14)",
    successSoft: "rgba(127, 198, 162, 0.13)",
    dangerSoft: "rgba(232, 144, 154, 0.13)",
    warningSoft: "rgba(219, 180, 108, 0.13)",
    transferSoft: "rgba(182, 171, 212, 0.13)",
  },
};

function hexToRgbTriplet(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

// Values for NativeWind's vars() — driving CSS variables directly from our
// own resolved theme state, not from react-native-css-interop's colorScheme
// observable. That observable only updates via a real OS appearance-change
// event or Appearance.setColorScheme()'s native-module round-trip; on this
// Android build (MainActivity doesn't override onConfigurationChanged, and
// nothing in the AndroidManifest wires day/night config changes back into
// it — confirmed by reading the generated native project directly),
// setColorScheme() never actually propagates. vars() sidesteps all of that:
// it's a plain inline style computed synchronously from `settings` here.
export function cssVars(scheme: "light" | "dark"): Record<string, string> {
  const p = palette[scheme];
  const s = SOFT[scheme];
  return {
    "--bg": hexToRgbTriplet(p.bg),
    "--surface": hexToRgbTriplet(p.surface),
    "--surface-2": hexToRgbTriplet(p.surface2),
    "--surface-3": hexToRgbTriplet(p.surface3),
    "--border": hexToRgbTriplet(p.border),
    "--border-strong": hexToRgbTriplet(p.borderStrong),
    "--fg": hexToRgbTriplet(p.fg),
    "--fg-muted": hexToRgbTriplet(p.fgMuted),
    "--fg-subtle": hexToRgbTriplet(p.fgSubtle),
    "--accent": hexToRgbTriplet(p.accent),
    "--accent-strong": hexToRgbTriplet(p.accentStrong),
    "--accent-soft": s.accentSoft,
    "--accent-fill": hexToRgbTriplet(p.accentFill),
    "--on-accent": hexToRgbTriplet(p.onAccent),
    "--success": hexToRgbTriplet(p.success),
    "--success-soft": s.successSoft,
    "--danger": hexToRgbTriplet(p.danger),
    "--danger-soft": s.dangerSoft,
    "--warning": hexToRgbTriplet(p.warning),
    "--warning-soft": s.warningSoft,
    "--transfer": hexToRgbTriplet(p.transfer),
    "--transfer-soft": s.transferSoft,
    "--glass-fill": p.glassFill,
    "--glass-fill-strong": p.glassFillStrong,
    "--glass-fill-press": p.glassFillPress,
    "--glass-border": p.glassBorder,
    "--glass-border-strong": p.glassBorderStrong,
  };
}

// V2 reinstates the Light/Dark/System choice (spec.md §5.19 "Theme V2"),
// reversing the design-refresh pass's hardcoded "always dark". Resolves
// settings.themePreference against the OS scheme for "system"; while
// settings hasn't loaded yet (first paint, mid-migration) falls back to
// "dark" so there's no flash of an unstyled/wrong-token screen.
export function resolveTheme(
  preference: "light" | "dark" | "system" | undefined,
  systemScheme: string | null | undefined,
): "light" | "dark" {
  const p = preference ?? "dark";
  if (p === "system") return systemScheme === "light" ? "light" : "dark";
  return p;
}

export function useResolvedTheme(): "light" | "dark" {
  const { settings } = useSettings();
  return resolveTheme(settings?.themePreference, useColorScheme());
}

export function useThemeColors(): ThemeColors {
  const scheme = useResolvedTheme();
  return palette[scheme];
}
