import { Stack } from "expo-router";

import { useThemeColors } from "../../../theme/palette";

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
      <Stack.Screen name="index" options={{ title: "Accounts" }} />
      <Stack.Screen name="[id]" options={{ title: "Account" }} />
    </Stack>
  );
}
