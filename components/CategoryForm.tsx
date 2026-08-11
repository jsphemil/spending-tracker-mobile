import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { CATEGORY_ICONS } from "../constants/categoryIcons";
import { COLOR_PALETTE } from "../constants/colorPalette";
import { CATEGORY_KINDS, type CategoryKind } from "../db/schema";
import type { CategoryInput } from "../db/actions/categories";

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

  function handleSubmit() {
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), kind, icon, color });
  }

  return (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 16, gap: 20 }}>
      <View className="gap-2">
        <Text className="text-sm font-medium text-gray-700">Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Groceries"
          className="rounded-lg border border-gray-200 px-3 py-2 text-base"
        />
      </View>

      <View className="gap-2">
        <Text className="text-sm font-medium text-gray-700">Type</Text>
        <View className="flex-row gap-2">
          {CATEGORY_KINDS.map((k) => (
            <Pressable
              key={k}
              onPress={() => setKind(k)}
              className={`flex-1 items-center rounded-lg border py-2 ${
                kind === k ? "border-blue-600 bg-blue-50" : "border-gray-200"
              }`}
            >
              <Text className={kind === k ? "text-blue-600" : "text-gray-700"}>
                {k === "expense" ? "Expense" : "Income"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View className="gap-2">
        <Text className="text-sm font-medium text-gray-700">Icon</Text>
        <View className="flex-row flex-wrap gap-2">
          {CATEGORY_ICONS.map((i) => (
            <Pressable
              key={i}
              onPress={() => setIcon(i)}
              className={`h-11 w-11 items-center justify-center rounded-full border ${
                icon === i ? "border-blue-600 bg-blue-50" : "border-gray-200"
              }`}
            >
              <MaterialCommunityIcons
                name={i}
                size={18}
                color={icon === i ? "#2563EB" : "#374151"}
              />
            </Pressable>
          ))}
        </View>
      </View>

      <View className="gap-2">
        <Text className="text-sm font-medium text-gray-700">Color</Text>
        <View className="flex-row flex-wrap gap-2">
          {COLOR_PALETTE.map((c) => (
            <Pressable
              key={c}
              onPress={() => setColor(c)}
              style={{ backgroundColor: c }}
              className={`h-9 w-9 rounded-full ${color === c ? "border-2 border-gray-900" : ""}`}
            />
          ))}
        </View>
      </View>

      <Pressable onPress={handleSubmit} className="items-center rounded-lg bg-blue-600 py-3">
        <Text className="text-base font-semibold text-white">{submitLabel}</Text>
      </Pressable>
    </ScrollView>
  );
}
