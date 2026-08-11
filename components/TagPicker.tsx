import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { findOrCreateTag } from "../db/actions/tags";
import { useTags } from "../db/queries/tags";

interface TagPickerProps {
  selectedTagIds: number[];
  onChange: (tagIds: number[]) => void;
}

export function TagPicker({ selectedTagIds, onChange }: TagPickerProps) {
  const { data: tags } = useTags();
  const [newTagName, setNewTagName] = useState("");

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
      <Text className="text-sm font-medium text-gray-700">Tags</Text>
      <View className="flex-row flex-wrap gap-2">
        {(tags ?? []).map((tag) => {
          const selected = selectedTagIds.includes(tag.id);
          return (
            <Pressable
              key={tag.id}
              onPress={() => toggle(tag.id)}
              className={`rounded-full border px-3 py-1.5 ${
                selected ? "border-blue-600 bg-blue-50" : "border-gray-200"
              }`}
            >
              <Text className={selected ? "text-blue-600" : "text-gray-700"}>
                {tag.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View className="flex-row gap-2">
        <TextInput
          value={newTagName}
          onChangeText={setNewTagName}
          placeholder="New tag"
          onSubmitEditing={addNewTag}
          className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-base"
        />
        <Pressable
          onPress={addNewTag}
          className="items-center justify-center rounded-lg border border-gray-200 px-4"
        >
          <Text>Add</Text>
        </Pressable>
      </View>
    </View>
  );
}
