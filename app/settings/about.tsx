import { Pressable, ScrollView, Text } from "react-native";
import { Link } from "expo-router";

import { appVersionLabel, sendFeedback } from "../../services/feedbackLink";

export default function AboutScreen() {
  const { appVersion, buildNumber } = appVersionLabel();
  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ padding: 16, gap: 12, alignItems: "center" }}>
      <Text className="font-display text-xl font-bold text-fg">Erebor Wealth Management</Text>
      <Text className="text-sm text-fg-subtle">
        v{appVersion} (build {buildNumber})
      </Text>
      <Text className="mt-4 text-center text-sm text-fg-muted">
        A local-first app for understanding where you stand, how you're doing this month, and
        what needs your attention — across accounts, spending, funds and commitments.
      </Text>
      <Link href="/settings/whats-new" asChild>
        <Pressable className="mt-4" accessibilityRole="button">
          <Text className="text-sm font-medium text-accent">What's new in this version</Text>
        </Pressable>
      </Link>
      <Pressable onPress={() => sendFeedback()} accessibilityRole="button">
        <Text className="text-sm font-medium text-accent">Send feedback</Text>
      </Pressable>
    </ScrollView>
  );
}
