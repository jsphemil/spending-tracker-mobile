import { Stack } from "expo-router";

import { useThemeColors } from "../../../theme/palette";

export default function TransactionsLayout() {
  const colors = useThemeColors();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { color: colors.fg, fontFamily: "Manrope_700Bold" },
        headerTintColor: colors.fg,
      }}
    >
      <Stack.Screen name="index" options={{ title: "Transactions" }} />
      <Stack.Screen name="calendar" options={{ title: "Calendar" }} />
    </Stack>
  );
}
