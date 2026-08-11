import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { CATEGORY_ICONS } from "../constants/categoryIcons";
import { COLOR_PALETTE } from "../constants/colorPalette";
import { CATEGORY_KINDS, type CategoryKind } from "../db/schema";
import type { CategoryInput } from "../db/actions/categories";
import { useThemeColors } from "../theme/palette";

interface CategoryFormProps {
  initialValues?: Partial<CategoryInput>;
  onSubmit: (values: CategoryInput) => void;
  submitLabel: string;
}

export function CategoryForm({ initialValues, onSubmit, submitLabel }: CategoryFormProps) {
  const [name, setName] = useState(initialValues?.name ?? "");
  const [kind, setKind] = useState<CategoryKind>(initialValues?.kind ?? "expense");
  const [icon, setIcon] = useState(initialValues?.icon ?? CATEGORY_ICONS[0]);
  const [color, setColor] = useState(initialValues?.color ?? COLOR_PALETTE[0]);
  const colors = useThemeColors();

  function handleSubmit() {
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), kind, icon, color });
  }

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ padding: 16, gap: 20 }}>
      <View className="gap-2">
        <Text className="text-sm font-medium text-fg-muted">Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Groceries"
          placeholderTextColor={colors.fgSubtle}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-base text-fg"
        />
      </View>

      <View className="gap-2">
        <Text className="text-sm font-medium text-fg-muted">Type</Text>
        <View className="flex-row gap-2">
          {CATEGORY_KINDS.map((k) => (
            <Pressable
              key={k}
              onPress={() => setKind(k)}
              className={`flex-1 items-center rounded-lg border py-2 ${
                kind === k ? "border-accent bg-accent-soft" : "border-border bg-surface"
              }`}
            >
              <Text className={kind === k ? "text-accent" : "text-fg-muted"}>
                {k === "expense" ? "Expense" : "Income"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View className="gap-2">
        <Text className="text-sm font-medium text-fg-muted">Icon</Text>
        <View className="flex-row flex-wrap gap-2">
          {CATEGORY_ICONS.map((i) => (
            <Pressable
              key={i}
              onPress={() => setIcon(i)}
              className={`h-11 w-11 items-center justify-center rounded-full border ${
                icon === i ? "border-accent bg-accent-soft" : "border-border bg-surface"
              }`}
            >
              <MaterialCommunityIcons
                name={i}
                size={18}
                color={icon === i ? colors.accent : colors.fgMuted}
              />
            </Pressable>
          ))}
        </View>
      </View>

      <View className="gap-2">
        <Text className="text-sm font-medium text-fg-muted">Color</Text>
        <View className="flex-row flex-wrap gap-2">
          {COLOR_PALETTE.map((c) => (
            <Pressable
              key={c}
              onPress={() => setColor(c)}
              style={{ backgroundColor: c }}
              className={`h-9 w-9 rounded-full ${color === c ? "border-2 border-fg" : ""}`}
            />
          ))}
        </View>
      </View>

      <Pressable onPress={handleSubmit} className="items-center rounded-lg bg-accent py-3">
        <Text className="text-base font-semibold text-white">{submitLabel}</Text>
      </Pressable>
    </ScrollView>
  );
}
