import { Pressable, Text, View } from "react-native";

import { Icon } from "./ui/Icon";
import { HINTS, parseHintsSeen, serializeHintsSeen, type HintId } from "../constants/hints";
import { updateSettings } from "../db/actions/settings";
import { useSettings } from "../db/queries/settings";
import { useThemeColors } from "../theme/palette";

// A dismissible one-time card (spec.md §5.22 "Walkthrough"), placed as the
// first item of a screen's scroll container. Renders nothing once its id
// is in settings.hints_seen, and nothing until settings have loaded —
// never a flash of a card the user already dismissed. `className` is for
// hosts without a `gap` (FlatList headers), so spacing exists only while
// the card does.
export function FirstVisitHint({ id, className = "" }: { id: HintId; className?: string }) {
  const { settings } = useSettings();
  const colors = useThemeColors();
  if (!settings) return null;

  const seen = parseHintsSeen(settings.hintsSeen);
  if (seen.includes(id)) return null;

  const hint = HINTS[id];
  return (
    <View className={`flex-row gap-3 rounded-card border border-accent/30 bg-accent-soft p-4 ${className}`}>
      <View className="flex-1 gap-1">
        <Text className="text-sm font-semibold text-accent">{hint.title}</Text>
        <Text className="text-sm text-fg-muted">{hint.body}</Text>
      </View>
      <Pressable
        onPress={() => updateSettings(settings.id, { hintsSeen: serializeHintsSeen([...seen, id]) })}
        accessibilityRole="button"
        accessibilityLabel="Dismiss hint"
        hitSlop={8}
        className="h-7 w-7 items-center justify-center rounded-full bg-glass"
      >
        <Icon name="close" size={14} color={colors.fg} />
      </Pressable>
    </View>
  );
}
