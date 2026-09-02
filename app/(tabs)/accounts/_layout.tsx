import { Stack } from "expo-router";

import { useThemeColors } from "../../../theme/palette";

// "index" (the Accounts list) renders its own GlobalHeader and has no
// in-navigator header. "[id]" (Account Detail) is a drill-in from
// that list and keeps a normal back+title header, same as before —
// spec.md §5.19 doesn't ask every screen to lose its way back.
export default function AccountsLayout() {
  const colors = useThemeColors();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { color: colors.fg, fontFamily: "Manrope_700Bold" },
        headerTintColor: colors.fg,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[id]" options={{ title: "Account" }} />
    </Stack>
  );
}
