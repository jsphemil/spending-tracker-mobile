import { Stack } from "expo-router";

// Single screen now — Calendar moved to a top-level shared route
// (app/calendar.tsx, spec.md §5.19). No in-navigator header: the
// Transactions tab renders its own GlobalHeader instead.
export default function TransactionsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
