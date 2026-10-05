import { MD3DarkTheme, MD3LightTheme, type MD3Theme } from "react-native-paper";

import { palette } from "./palette";

// react-native-paper (spec.md §5.24) is used for a few Material controls
// only — currently the Transactions search bar. NativeWind stays the
// styling system; this maps our semantic tokens onto Paper's MD3 roles so
// those controls can't drift from the rest of the app.
export function paperTheme(scheme: "light" | "dark"): MD3Theme {
  const base = scheme === "dark" ? MD3DarkTheme : MD3LightTheme;
  const p = palette[scheme];
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: p.accent,
      onPrimary: p.onAccent,
      background: p.bg,
      surface: p.surface,
      surfaceVariant: p.surface2,
      onSurface: p.fg,
      onSurfaceVariant: p.fgMuted,
      outline: p.borderStrong,
      outlineVariant: p.border,
      error: p.danger,
      elevation: { ...base.colors.elevation, level3: p.surface2 },
    },
  };
}
