import { Pressable, ScrollView, Text, View } from "react-native";

import { Icon } from "../../components/ui/Icon";
import { updateSettings } from "../../db/actions/settings";
import { useSettings } from "../../db/queries/settings";
import { THEME_PREFERENCES, type ThemePreference } from "../../db/schema";
import { useThemeColors } from "../../theme/palette";

const OPTION_LABELS: Record<ThemePreference, { label: string; sublabel: string; icon: string }> = {
  system: { label: "System", sublabel: "Match your device setting", icon: "settings-outline" },
  light: { label: "Light", sublabel: "Always use the light palette", icon: "star" },
  dark: { label: "Dark", sublabel: "Always use the dark palette", icon: "shield" },
};

// Reinstates the Light/Dark/System choice removed in the §5.18 dark-only
// pass — theme/palette.ts's useResolvedTheme() now actually resolves this
// again instead of hardcoding "dark" (spec.md §5.19 "Theme V2").
export default function AppearanceSettingsScreen() {
  const { settings } = useSettings();
  const colors = useThemeColors();
  if (!settings) return null;

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ padding: 16, gap: 12 }}>
      {THEME_PREFERENCES.map((preference) => {
        const selected = settings.themePreference === preference;
        const meta = OPTION_LABELS[preference];
        return (
          <Pressable
            key={preference}
            onPress={() => updateSettings(settings.id, { themePreference: preference })}
            accessibilityRole="button"
            accessibilityLabel={meta.label}
            className={`flex-row items-center gap-3 rounded-2xl border px-4 py-3.5 ${
              selected ? "border-accent bg-accent-soft" : "border-glass-border bg-glass"
            }`}
          >
            <Icon name={meta.icon} size={18} color={selected ? colors.accent : colors.fg} />
            <View className="flex-1">
              <Text className="text-base text-fg">{meta.label}</Text>
              <Text className="text-xs text-fg-muted">{meta.sublabel}</Text>
            </View>
            {selected && <Text className="text-accent">✓</Text>}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
