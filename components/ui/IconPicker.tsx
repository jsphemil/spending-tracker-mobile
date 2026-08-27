import { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { ALL_ICON_OPTIONS, ICON_LIBRARY } from "../../constants/iconLibrary";
import { useThemeColors } from "../../theme/palette";
import { Icon } from "./Icon";

interface IconPickerProps {
  value: string;
  onChange: (key: string) => void;
  label?: string;
}

// Full-freedom icon picker for categories and accounts — a searchable,
// grouped grid over constants/iconLibrary.ts's ~70 options. Replaces the
// old fixed 19-icon CategoryForm grid; the selected `key` is plain string
// data (same as before), rendered via theme/icons.ts's Lucide lookup.
export function IconPicker({ value, onChange, label = "Icon" }: IconPickerProps) {
  const colors = useThemeColors();
  const [query, setQuery] = useState("");

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ICON_LIBRARY;
    return ICON_LIBRARY.map((g) => ({
      ...g,
      icons: g.icons.filter((i) => i.label.toLowerCase().includes(q) || i.key.includes(q)),
    })).filter((g) => g.icons.length > 0);
  }, [query]);

  const selectedLabel = ALL_ICON_OPTIONS.find((i) => i.key === value)?.label;

  return (
    <View className="gap-2">
      <Text className="text-sm font-medium text-fg-muted">
        {label}
        {selectedLabel ? ` · ${selectedLabel}` : ""}
      </Text>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search icons…"
        placeholderTextColor={colors.fgSubtle}
        className="rounded-icon-badge border border-glass-border bg-glass px-3 py-2 text-base text-fg"
      />
      <View className="gap-4">
        {filteredGroups.map((group) => (
          <View key={group.title} className="gap-2">
            <Text className="text-xs font-semibold uppercase text-fg-subtle">{group.title}</Text>
            <View className="flex-row flex-wrap gap-2">
              {group.icons.map((opt) => {
                const active = value === opt.key;
                return (
                  <Pressable
                    key={opt.key}
                    onPress={() => onChange(opt.key)}
                    className={`h-11 w-11 items-center justify-center rounded-full border ${
                      active ? "border-accent bg-accent-soft" : "border-glass-border bg-glass"
                    }`}
                  >
                    <Icon name={opt.key} size={18} color={active ? colors.accent : colors.fgMuted} />
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
