import { Stack } from "expo-router";

import { useThemeColors } from "../../theme/palette";

// Settings' own Stack, with normal in-navigator headers (back button +
// title) — deliberately NOT the global header/FAB shell (spec.md §5.19:
// "The header must NOT appear on Settings" / "must NOT appear on Settings").
export default function SettingsLayout() {
  const colors = useThemeColors();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { color: colors.fg, fontFamily: "Manrope_700Bold" },
        headerTintColor: colors.fg,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Settings" }} />
      <Stack.Screen name="account" options={{ title: "Account Details" }} />
      <Stack.Screen name="currency" options={{ title: "Default Currency" }} />
      <Stack.Screen name="notifications" options={{ title: "Notifications" }} />
      <Stack.Screen name="appearance" options={{ title: "Appearance" }} />
      <Stack.Screen name="privacy" options={{ title: "Privacy & Security" }} />
      <Stack.Screen name="support" options={{ title: "Help & Support" }} />
      <Stack.Screen name="about" options={{ title: "About Erebor" }} />
      <Stack.Screen name="export" options={{ title: "Export Transactions" }} />
    </Stack>
  );
}
