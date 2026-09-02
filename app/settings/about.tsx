import { ScrollView, Text, View } from "react-native";
import Constants from "expo-constants";

export default function AboutScreen() {
  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ padding: 16, gap: 12, alignItems: "center" }}>
      <Text className="font-display text-xl font-bold text-fg">Erebor Wealth Management</Text>
      <Text className="text-sm text-fg-subtle">v{Constants.expoConfig?.version ?? "1.0.0"}</Text>
      <Text className="mt-4 text-center text-sm text-fg-muted">
        A local-first app for understanding where you stand, how you're doing this month, and
        what needs your attention — across accounts, spending, goals and commitments.
      </Text>
    </ScrollView>
  );
}
