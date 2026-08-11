import { Stack } from "expo-router";

export default function TransactionsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Transactions" }} />
      <Stack.Screen name="calendar" options={{ title: "Calendar" }} />
    </Stack>
  );
}
