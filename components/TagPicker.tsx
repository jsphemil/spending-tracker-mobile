import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Input } from "./ui/Input";

import { findOrCreateTag } from "../db/actions/tags";
import { useTags } from "../db/queries/tags";
import { useThemeColors } from "../theme/palette";

interface TagPickerProps {
  selectedTagIds: number[];
  onChange: (tagIds: number[]) => void;
}

export function TagPicker({ selectedTagIds, onChange }: TagPickerProps) {
  const { data: tags } = useTags();
  const [newTagName, setNewTagName] = useState("");
  const colors = useThemeColors();

  function toggle(tagId: number) {
    onChange(
      selectedTagIds.includes(tagId)
        ? selectedTagIds.filter((id) => id !== tagId)
        : [...selectedTagIds, tagId],
    );
  }

  function addNewTag() {
    if (!newTagName.trim()) return;
    const id = findOrCreateTag(newTagName);
    setNewTagName("");
    if (!selectedTagIds.includes(id)) onChange([...selectedTagIds, id]);
  }

  return (
    <View className="gap-2">
      <Text className="text-sm font-medium text-fg-muted">Tags</Text>
      <View className="flex-row flex-wrap gap-2">
        {(tags ?? []).map((tag) => {
          const selected = selectedTagIds.includes(tag.id);
          return (
            <Pressable
              key={tag.id}
              onPress={() => toggle(tag.id)}
              className={`rounded-full border px-3 py-1.5 ${
                selected ? "border-accent bg-accent-soft" : "border-glass-border"
              }`}
            >
              <Text className={selected ? "text-accent" : "text-fg-muted"}>
                {tag.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View className="flex-row gap-2">
        <Input
          value={newTagName}
          onChangeText={setNewTagName}
          placeholder="New tag"
          placeholderTextColor={colors.fgSubtle}
          className="flex-1 rounded-lg border border-glass-border bg-glass px-3 py-2 text-base text-fg"
        />
        <Pressable
          onPress={addNewTag}
          className="items-center justify-center rounded-lg border border-glass-border bg-glass px-4"
        >
          <Text className="text-fg">Add</Text>
        </Pressable>
      </View>
    </View>
  );
}
