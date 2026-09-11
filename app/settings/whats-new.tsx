import { ScrollView, Text, View } from "react-native";

import { CHANGELOG } from "../../constants/changelog";
import { appVersionLabel } from "../../services/feedbackLink";

// The full release history (spec.md §5.22 "What's new"). The one-time
// sheet after an update shows only the newest entry; this is where a
// tester goes to see everything.
export default function WhatsNewScreen() {
  const { appVersion } = appVersionLabel();
  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ padding: 16, gap: 12 }}>
      {CHANGELOG.map((entry) => (
        <View key={entry.version} className="rounded-card border border-glass-border bg-glass p-4">
          <View className="mb-2 flex-row items-baseline justify-between">
            <Text className="font-display text-base font-bold text-fg">
              {entry.version}
              {entry.version === appVersion ? "  ·  installed" : ""}
            </Text>
            <Text className="text-xs text-fg-subtle">{entry.date}</Text>
          </View>
          <Text className="mb-2 text-sm font-semibold text-fg">{entry.title}</Text>
          <View className="gap-1.5">
            {entry.highlights.map((h) => (
              <View key={h} className="flex-row gap-2">
                <Text className="text-sm text-fg-muted">•</Text>
                <Text className="flex-1 text-sm text-fg-muted">{h}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}
