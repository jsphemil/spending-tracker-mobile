import { useColorScheme } from "react-native";

import { useSettings } from "../db/queries/settings";

// Mirrors global.css's CSS-variable tokens as literal hex values, for the
// handful of consumers that can't take a Tailwind className (react-native-svg
// stroke/fill props, icon `color` props). Dark values are the
// Erebor design system's tokens (Claude Design project
// d5887e1e-2512-436b-9f64-e086c0c538de, tokens/colors.css) — keep both in
// sync by hand if either changes, the token set is small and changes rarely.
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
  accent: string;
  accentStrong: string;
  success: string;
  danger: string;
  transfer: string;
  // Frosted-glass panel tiers (translucent — approximated with plain
  // semi-transparent fills, no real blur; see spec's design-refresh plan).
  glassFill: string;
  glassFillStrong: string;
  glassFillPress: string;
  glassBorder: string;
  glassBorderStrong: string;
}

export const palette: Record<"light" | "dark", ThemeColors> = {
  light: {
    bg: "#f5f5f8",
    surface: "#ffffff",
    surface2: "#f0f0f5",
    surface3: "#e8e9f0",
    border: "#e2e3ea",
    borderStrong: "#cfd1dc",
    fg: "#16171c",
    fgMuted: "#62667a",
    fgSubtle: "#9498a8",
    accent: "#5b4fe0",
    accentStrong: "#4a3fd0",
    success: "#12a57c",
    danger: "#e0435a",
    transfer: "#b45309",
    glassFill: "rgba(0, 0, 0, 0.04)",
    glassFillStrong: "rgba(0, 0, 0, 0.07)",
    glassFillPress: "rgba(0, 0, 0, 0.10)",
    glassBorder: "rgba(0, 0, 0, 0.08)",
    glassBorderStrong: "rgba(0, 0, 0, 0.14)",
  },
  dark: {
    bg: "#0c1120",
    surface: "#131a2c",
    surface2: "#1a2338",
    surface3: "#212b45",
    border: "#1f2432",
    borderStrong: "#2e323f",
    fg: "#f6f8fc",
    fgMuted: "#97a1bc",
    fgSubtle: "#5c6584",
    accent: "#48e7f5",
    accentStrong: "#4c7dff",
    success: "#2fe39b",
    danger: "#ff5c72",
    transfer: "#ffc24b",
    glassFill: "rgba(255, 255, 255, 0.06)",
    glassFillStrong: "rgba(255, 255, 255, 0.10)",
    glassFillPress: "rgba(255, 255, 255, 0.14)",
    glassBorder: "rgba(255, 255, 255, 0.12)",
    glassBorderStrong: "rgba(255, 255, 255, 0.20)",
  },
};

// Soft (pre-alpha'd) tokens, same values as global.css — kept separate from
// `palette` above since they're rgba() strings, not solid hex, and only
// needed by the CSS-variable path (cssVars below), not by SVG/icon
// consumers of `palette`.
const SOFT: Record<"light" | "dark", Record<"accentSoft" | "successSoft" | "dangerSoft" | "transferSoft", string>> = {
  light: {
    accentSoft: "rgba(91, 79, 224, 0.1)",
    successSoft: "rgba(18, 165, 124, 0.12)",
    dangerSoft: "rgba(224, 67, 90, 0.1)",
    transferSoft: "rgba(180, 83, 9, 0.1)",
  },
  dark: {
    accentSoft: "rgba(72, 231, 245, 0.14)",
    successSoft: "rgba(47, 227, 155, 0.14)",
    dangerSoft: "rgba(255, 92, 114, 0.14)",
    transferSoft: "rgba(255, 194, 75, 0.14)",
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
    "--success": hexToRgbTriplet(p.success),
    "--success-soft": s.successSoft,
    "--danger": hexToRgbTriplet(p.danger),
    "--danger-soft": s.dangerSoft,
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
