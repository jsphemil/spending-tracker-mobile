import { useRef, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";

import { COLOR_PALETTE } from "../constants/colorPalette";
import type { TagInput } from "../db/actions/tags";
import { useThemeColors } from "../theme/palette";
import { FormScrollView } from "./ui/FormScrollView";
import { Button } from "./ui/Button";
import { IconPicker } from "./ui/IconPicker";
import { Input } from "./ui/Input";

interface TagFormProps {
  initialValues: TagInput;
  /** How many transactions carry the tag — quoted in the delete confirm. */
  transactionCount: number;
  /** Returns an error message to show, or null when saved. */
  onSubmit: (values: TagInput) => string | null;
  onDelete: () => void;
}

// Edit-only (spec.md §5.3a): tags are *created* inline from a transaction,
// which is where they belong; this screen is for naming, colouring and
// iconing one after the fact. Same shape as FundForm's lower half.
export function TagForm({ initialValues, transactionCount, onSubmit, onDelete }: TagFormProps) {
  const colors = useThemeColors();
  const [name, setName] = useState(initialValues.name);
  const [icon, setIcon] = useState(initialValues.icon);
  const [color, setColor] = useState(initialValues.color);
  const [error, setError] = useState<string | null>(null);
  const submittingRef = useRef(false);

  function handleSubmit() {
    if (submittingRef.current) return;
    submittingRef.current = true;
    const result = onSubmit({ name: name.trim(), icon, color });
    if (result) {
      submittingRef.current = false;
      setError(result);
    }
  }

  function confirmDelete() {
    const carried =
      transactionCount === 0
        ? "No transactions carry it."
        : `${transactionCount} transaction${transactionCount === 1 ? "" : "s"} carry it — they keep everything else and only lose this label.`;
    Alert.alert("Delete tag", `Delete "${initialValues.name}"? ${carried}`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: onDelete },
    ]);
  }

  return (
    <FormScrollView contentContainerStyle={{ padding: 16, gap: 20 }}>
      <View className="gap-2">
        <Text className="text-sm font-medium text-fg-muted">Tag name</Text>
        <Input
          value={name}
          onChangeText={setName}
          placeholder="e.g. Kodaikanal 09'26"
          placeholderTextColor={colors.fgSubtle}
          className="rounded-lg border border-glass-border bg-glass px-3 py-2 text-base text-fg"
        />
      </View>

      <View className="gap-2">
        <Text className="text-sm font-medium text-fg-muted">Colour</Text>
        <View className="flex-row flex-wrap gap-2">
          {COLOR_PALETTE.map((swatch) => (
            <Pressable
              key={swatch}
              onPress={() => setColor(swatch)}
              accessibilityRole="button"
              accessibilityLabel={`Colour ${swatch}`}
              className={`h-9 w-9 rounded-full border-2 ${
                color === swatch ? "border-accent" : "border-transparent"
              }`}
              style={{ backgroundColor: swatch }}
            />
          ))}
        </View>
      </View>

      <IconPicker value={icon} onChange={setIcon} />

      {error && <Text className="text-sm text-danger">{error}</Text>}

      <Button onPress={handleSubmit}>Save</Button>
      <Button onPress={confirmDelete} variant="danger">
        Delete tag
      </Button>
    </FormScrollView>
  );
}
