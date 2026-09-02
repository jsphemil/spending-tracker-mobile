import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Input } from "./ui/Input";
import DateTimePicker from "@react-native-community/datetimepicker";

import type { GoalInput } from "../db/actions/goals";
import { useSettings } from "../db/queries/settings";
import { currencySymbol, majorToMinor, minorToMajor } from "../services/format";
import { useThemeColors } from "../theme/palette";
import { Button } from "./ui/Button";

interface GoalFormProps {
  initialValues?: Partial<GoalInput>;
  onSubmit: (values: GoalInput) => void;
  submitLabel: string;
}

export function GoalForm({ initialValues, onSubmit, submitLabel }: GoalFormProps) {
  const { settings } = useSettings();
  // Goals track net worth across every account, so — same as category
  // budgets — the target is always entered in the app's own base currency,
  // read live rather than hardcoded (spec.md §5.19 "Global country-neutral
  // requirement" — a hardcoded "INR" here would silently mis-scale minor
  // units for a zero-decimal base currency like JPY).
  const goalCurrency = settings?.baseCurrency ?? "INR";
  const [name, setName] = useState(initialValues?.name ?? "");
  const [targetText, setTargetText] = useState(
    initialValues?.targetAmountMinor != null
      ? String(minorToMajor(initialValues.targetAmountMinor, goalCurrency))
      : "",
  );
  const [targetDate, setTargetDate] = useState<Date | null>(initialValues?.targetDate ?? null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const colors = useThemeColors();

  function handleSubmit() {
    if (!name.trim()) {
      setError("Goal name is required");
      return;
    }
    const target = Number(targetText);
    if (!Number.isFinite(target) || target <= 0) {
      setError("Target net worth must be greater than 0");
      return;
    }
    setError(null);
    onSubmit({
      name: name.trim(),
      targetAmountMinor: majorToMinor(target, goalCurrency),
      targetDate,
    });
  }

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ padding: 16, gap: 20 }}>
      <View className="gap-2">
        <Text className="text-sm font-medium text-fg-muted">Goal name</Text>
        <Input
          value={name}
          onChangeText={setName}
          placeholder="e.g. Emergency fund, House down payment"
          placeholderTextColor={colors.fgSubtle}
          className="rounded-lg border border-glass-border bg-glass px-3 py-2 text-base text-fg"
        />
      </View>

      <View className="gap-2">
        <Text className="text-sm font-medium text-fg-muted">
          Target net worth ({currencySymbol(goalCurrency).trim()})
        </Text>
        <Input
          value={targetText}
          onChangeText={setTargetText}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={colors.fgSubtle}
          className="font-data rounded-lg border border-glass-border bg-glass px-3 py-2 text-lg text-fg"
        />
      </View>

      <View className="gap-2">
        <Text className="text-sm font-medium text-fg-muted">Target date (optional)</Text>
        <Pressable
          onPress={() => setShowDatePicker(true)}
          className="rounded-lg border border-glass-border bg-glass px-3 py-2"
        >
          <Text className="text-fg">{targetDate ? targetDate.toDateString() : "No target date"}</Text>
        </Pressable>
        {showDatePicker && (
          <DateTimePicker
            value={targetDate ?? new Date()}
            mode="date"
            onChange={(_, selected) => {
              setShowDatePicker(false);
              if (selected) setTargetDate(selected);
            }}
          />
        )}
      </View>

      {error && <Text className="text-sm text-danger">{error}</Text>}

      <Button onPress={handleSubmit}>{submitLabel}</Button>
    </ScrollView>
  );
}
