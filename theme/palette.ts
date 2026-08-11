import { useColorScheme as useSystemColorScheme } from "react-native";

import { useSettings } from "../db/queries/settings";
import type { ThemePreference } from "../db/schema";

// Mirrors global.css's CSS-variable tokens as literal hex values, for the
// handful of consumers that can't take a Tailwind className (react-native-svg
// stroke/fill props, @expo/vector-icons' color prop). Values verified
// directly against the source web app's src/app/globals.css (spec.md §5.12)
// — keep both in sync by hand if either changes, the token set is small and
// changes rarely.
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
  },
  dark: {
    bg: "#0b0c10",
    surface: "#14161c",
    surface2: "#1a1d25",
    surface3: "#20232d",
    border: "#262a35",
    borderStrong: "#333748",
    fg: "#ecedf2",
    fgMuted: "#8b90a0",
    fgSubtle: "#5c6072",
    accent: "#8b7ffb",
    accentStrong: "#a89bff",
    success: "#35d0a0",
    danger: "#ff6b80",
    transfer: "#f5c451",
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
    accentSoft: "rgba(139, 127, 251, 0.14)",
    successSoft: "rgba(53, 208, 160, 0.12)",
    dangerSoft: "rgba(255, 107, 128, 0.12)",
    transferSoft: "rgba(245, 196, 81, 0.14)",
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
  };
}

// Single source of truth for "light" or "dark" right now — resolves
// settings.themePreference ("light"|"dark"|"system") against the OS's
// actual current appearance for the "system" case, via React Native's own
// useColorScheme (reactive to real OS changes independent of the broken
// nativewind colorScheme path above).
export function useResolvedTheme(): "light" | "dark" {
  const { settings } = useSettings();
  const systemScheme = useSystemColorScheme();
  const preference: ThemePreference = settings?.themePreference ?? "system";
  if (preference === "system") return systemScheme === "dark" ? "dark" : "light";
  return preference;
}

export function useThemeColors(): ThemeColors {
  const scheme = useResolvedTheme();
  return palette[scheme];
}
