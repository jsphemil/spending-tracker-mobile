import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "./ui/Button";
import { Icon } from "./ui/Icon";
import { changelogFor } from "../constants/changelog";
import { useThemeColors } from "../theme/palette";

// The one-time "What's new in X" sheet (spec.md §5.22), shown by the
// Dashboard on the first launch after an update — same bottom-sheet shape
// as GlobalHeader's InfoModal. The parent decides *whether* to show it
// (constants/changelog.ts's shouldShowWhatsNew) and records the dismissal;
// this component only renders one version's entry.
export function WhatsNewSheet({
  version,
  visible,
  onClose,
}: {
  version: string;
  visible: boolean;
  onClose: () => void;
}) {
  const colors = useThemeColors();
  const entry = changelogFor(version);
  if (!entry) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <View className="flex-1 justify-end bg-black/50">
        <SafeAreaView edges={["bottom"]} className="max-h-[80%] rounded-t-3xl bg-bg">
          <View className="flex-row items-center justify-between border-b border-glass-border px-5 py-4">
            <View>
              <Text className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">
                What&rsquo;s new in {entry.version}
              </Text>
              <Text className="font-display text-lg font-bold text-fg">{entry.title}</Text>
            </View>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
              className="h-8 w-8 items-center justify-center rounded-full bg-glass"
            >
              <Icon name="close" size={16} color={colors.fg} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
            {entry.highlights.map((h) => (
              <View key={h} className="flex-row gap-2">
                <Icon name="check-circle" size={16} color={colors.accent} />
                <Text className="flex-1 text-sm text-fg-muted">{h}</Text>
              </View>
            ))}
            <Link href="/settings/whats-new" asChild>
              <Pressable onPress={onClose} className="mt-2">
                <Text className="text-xs font-medium text-accent">See earlier versions →</Text>
              </Pressable>
            </Link>
            <Button onPress={onClose} className="mt-2">
              Got it
            </Button>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
