import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Input } from "./ui/Input";

import { ALL_ICON_OPTIONS } from "../constants/iconLibrary";
import { COLOR_PALETTE } from "../constants/colorPalette";
import { Button } from "./ui/Button";
import { IconPicker } from "./ui/IconPicker";
import { CATEGORY_KINDS, type CategoryKind } from "../db/schema";
import type { CategoryInput } from "../db/actions/categories";
import { useSettings } from "../db/queries/settings";
import { currencySymbol, majorToMinor, minorToMajor } from "../services/format";
import { useThemeColors } from "../theme/palette";

interface CategoryFormProps {
  initialValues?: Partial<CategoryInput>;
  onSubmit: (values: CategoryInput) => void;
  submitLabel: string;
}

export function CategoryForm({ initialValues, onSubmit, submitLabel }: CategoryFormProps) {
  const { settings } = useSettings();
  // Category budgets are always tracked in the app's own base currency,
  // matching how cross-account totals are aggregated elsewhere (Dashboard,
  // Transactions summary band) — a category isn't scoped to one account/
  // currency the way accounts.budgetMonthlyMinor is. Reads the user's
  // actual chosen base currency (not a hardcoded "INR") so minor-unit
  // scaling stays correct for zero-decimal currencies too (spec.md §5.19
  // "Global country-neutral requirement").
  const budgetCurrency = settings?.baseCurrency ?? "INR";
  const [name, setName] = useState(initialValues?.name ?? "");
  const [kind, setKind] = useState<CategoryKind>(initialValues?.kind ?? "expense");
  const [icon, setIcon] = useState(initialValues?.icon ?? ALL_ICON_OPTIONS[0].key);
  const [color, setColor] = useState(initialValues?.color ?? COLOR_PALETTE[0]);
  const [budgetText, setBudgetText] = useState(
    initialValues?.monthlyBudgetMinor != null
      ? String(minorToMajor(initialValues.monthlyBudgetMinor, budgetCurrency))
      : "",
  );
  const [error, setError] = useState<string | null>(null);
  const colors = useThemeColors();

  function handleSubmit() {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    const budgetNum = budgetText ? Number(budgetText) : null;
    if (budgetNum !== null && !(budgetNum > 0)) {
      setError("Monthly budget must be greater than 0");
      return;
    }
    setError(null);
    onSubmit({
      name: name.trim(),
      kind,
      icon,
      color,
      monthlyBudgetMinor: budgetNum !== null ? majorToMinor(budgetNum, budgetCurrency) : null,
    });
  }

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ padding: 16, gap: 20 }}>
      <View className="gap-2">
        <Text className="text-sm font-medium text-fg-muted">Name</Text>
        <Input
          value={name}
          onChangeText={setName}
          placeholder="e.g. Groceries"
          placeholderTextColor={colors.fgSubtle}
          className="rounded-lg border border-glass-border bg-glass px-3 py-2 text-base text-fg"
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
                kind === k ? "border-accent bg-accent-soft" : "border-glass-border bg-glass"
              }`}
            >
              <Text className={kind === k ? "text-accent" : "text-fg-muted"}>
                {k === "expense" ? "Expense" : "Income"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <IconPicker value={icon} onChange={setIcon} />

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

      {kind === "expense" && (
        <View className="gap-2">
          <Text className="text-sm font-medium text-fg-muted">
            Monthly Budget ({currencySymbol(budgetCurrency).trim()}, optional)
          </Text>
          <Input
            value={budgetText}
            onChangeText={setBudgetText}
            keyboardType="decimal-pad"
            placeholder="No budget set"
            placeholderTextColor={colors.fgSubtle}
            className="rounded-lg border border-glass-border bg-glass px-3 py-2 text-base text-fg"
          />
        </View>
      )}

      {error && <Text className="text-sm text-danger">{error}</Text>}

      <Button onPress={handleSubmit}>{submitLabel}</Button>
    </ScrollView>
  );
}
