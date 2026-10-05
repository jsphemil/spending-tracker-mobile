import { useColorScheme } from "react-native";

import { useSettings } from "../db/queries/settings";

// The semantic colour roles (DESIGN.md §4). Mirrored into CSS variables by
// cssVars() below for className consumers; read directly by the handful
// that can't take a className (react-native-svg props, icon `color`).
// global.css carries the same values as a pre-settings fallback — keep the
// two in sync by hand.
//
// V4 (spec.md §5.24): calm navy (light) / soft sky blue (dark), replacing the
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
  // Primary: actions, selected navigation, key interactive elements.
  accent: string;
  accentStrong: string;
  // Text/icons drawn on a solid accent fill.
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
  // Soft cool-neutral page, white surfaces, deep navy accent.
  light: {
    bg: "#f6f6f8",
    surface: "#ffffff",
    surface2: "#efeff3",
    surface3: "#e4e4ea",
    border: "#e2e2e8",
    borderStrong: "#c9c9d3",
    fg: "#16171d",
    fgMuted: "#555867",
    fgSubtle: "#676a78",
    accent: "#203d6e",
    accentStrong: "#172e55",
    onAccent: "#ffffff",
    success: "#2b7a57",
    danger: "#b03f4c",
    warning: "#94600f",
    transfer: "#6a5f88",
    chart1: "#203d6e",
    chart2: "#b07a2a",
    chart3: "#3f8a8c",
    glassFill: "#ffffff",
    glassFillStrong: "rgba(22, 23, 29, 0.05)",
    glassFillPress: "rgba(22, 23, 29, 0.08)",
    glassBorder: "rgba(22, 23, 29, 0.08)",
    glassBorderStrong: "rgba(22, 23, 29, 0.14)",
  },
  // Deep neutral (not black), slightly lifted surfaces, off-white text and
  // desaturated accents — designed for checking finances at night, not a
  // darkened copy of light.
  dark: {
    bg: "#121318",
    surface: "#1a1b22",
    surface2: "#22232b",
    surface3: "#2b2c35",
    border: "#2a2b33",
    borderStrong: "#3a3b45",
    fg: "#e7e7ee",
    fgMuted: "#a4a6b3",
    fgSubtle: "#8b8d9b",
    accent: "#a3c4f2",
    accentStrong: "#bfd6f6",
    onAccent: "#0e1a30",
    success: "#7fc6a2",
    danger: "#e8909a",
    warning: "#dbb46c",
    transfer: "#b6abd4",
    chart1: "#a3c4f2",
    chart2: "#dbb46c",
    chart3: "#7fbfc0",
    glassFill: "rgba(255, 255, 255, 0.04)",
    glassFillStrong: "rgba(255, 255, 255, 0.07)",
    glassFillPress: "rgba(255, 255, 255, 0.10)",
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
    accentSoft: "rgba(32, 61, 110, 0.08)",
    successSoft: "rgba(43, 122, 87, 0.10)",
    dangerSoft: "rgba(176, 63, 76, 0.09)",
    warningSoft: "rgba(148, 96, 15, 0.10)",
    transferSoft: "rgba(106, 95, 136, 0.10)",
  },
  dark: {
    accentSoft: "rgba(163, 196, 242, 0.14)",
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
export function useResolvedTheme(): "light" | "dark" {
  const { settings } = useSettings();
  const systemScheme = useColorScheme();
  const preference = settings?.themePreference ?? "dark";
  if (preference === "system") return systemScheme === "light" ? "light" : "dark";
  return preference;
}

export function useThemeColors(): ThemeColors {
  const scheme = useResolvedTheme();
  return palette[scheme];
}
