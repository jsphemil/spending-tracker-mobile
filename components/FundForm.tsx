import { useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

import { AmountOperatorRow } from "./AmountOperatorRow";
import { COLOR_PALETTE } from "../constants/colorPalette";
import type { FundInput } from "../db/actions/funds";
import { useSettings } from "../db/queries/settings";
import { evaluateExpression } from "../services/calculator";
import { currencySymbol, majorToMinor, minorToMajor } from "../services/format";
import { useThemeColors } from "../theme/palette";
import { Button } from "./ui/Button";
import { Icon } from "./ui/Icon";
import { IconPicker } from "./ui/IconPicker";
import { Input } from "./ui/Input";

// Tapping one of these fills in the name, icon and colour together, so the
// common case is two taps and an amount rather than five separate
// decisions. They're only a starting point — every field stays editable.
const SUGGESTED_PURPOSES: { name: string; icon: string; color: string }[] = [
  { name: "New laptop", icon: "laptop", color: "#6366F1" },
  { name: "New phone", icon: "cellphone", color: "#0EA5E9" },
  { name: "Vacation", icon: "airplane", color: "#14B8A6" },
  { name: "Emergency reserve", icon: "shield", color: "#22C55E" },
  { name: "Insurance premium", icon: "receipt", color: "#EAB308" },
  { name: "Car down payment", icon: "car", color: "#F97316" },
  { name: "Home renovation", icon: "hammer", color: "#8B5CF6" },
  { name: "Christmas gifts", icon: "gift", color: "#EC4899" },
];

const DEFAULT_ICON = "piggy-bank";
const DEFAULT_COLOR = COLOR_PALETTE[6];

interface FundFormProps {
  initialValues?: Partial<FundInput>;
  onSubmit: (values: FundInput) => void;
  submitLabel: string;
  /** Suggestions only help when naming a brand-new fund. */
  showSuggestions?: boolean;
}

export function FundForm({
  initialValues,
  onSubmit,
  submitLabel,
  showSuggestions = false,
}: FundFormProps) {
  const { settings } = useSettings();
  // A fund's target is a slice of total wealth, so — same as goals and
  // category budgets — it's always entered in the app's own base currency,
  // read live rather than hardcoded (a hardcoded "INR" would mis-scale
  // minor units for a zero-decimal base currency like JPY).
  const fundCurrency = settings?.baseCurrency ?? "INR";
  const colors = useThemeColors();

  const [name, setName] = useState(initialValues?.name ?? "");
  const [targetText, setTargetText] = useState(
    initialValues?.targetAmountMinor != null
      ? String(minorToMajor(initialValues.targetAmountMinor, fundCurrency))
      : "",
  );
  const [targetDate, setTargetDate] = useState<Date | null>(initialValues?.targetDate ?? null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [icon, setIcon] = useState(initialValues?.icon ?? DEFAULT_ICON);
  const [color, setColor] = useState(initialValues?.color ?? DEFAULT_COLOR);
  const [error, setError] = useState<string | null>(null);

  // Same double-tap guard as TransactionForm: an unguarded save button
  // already wrote five identical rows into a real ledger once. A ref, not
  // state, because two taps in one frame would both read a stale `false`.
  const submittingRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit() {
    if (!name.trim()) {
      setError("Fund name is required");
      return;
    }
    const target = evaluateExpression(targetText);
    if (target === null) {
      setError("Enter a valid amount or expression (e.g. 85000+12000)");
      return;
    }
    if (target <= 0) {
      setError("Target must be greater than 0");
      return;
    }
    setError(null);

    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      onSubmit({
        name: name.trim(),
        targetAmountMinor: majorToMinor(target, fundCurrency),
        targetDate,
        icon,
        color,
      });
    } catch (submitError) {
      submittingRef.current = false;
      setSubmitting(false);
      setError(submitError instanceof Error ? submitError.message : "Could not save. Please try again.");
    }
  }

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ padding: 16, gap: 20 }}>
      {showSuggestions && (
        <View className="gap-2">
          <Text className="text-sm font-medium text-fg-muted">What is this for?</Text>
          <View className="flex-row flex-wrap gap-2">
            {SUGGESTED_PURPOSES.map((purpose) => {
              const active = name === purpose.name;
              return (
                <Pressable
                  key={purpose.name}
                  onPress={() => {
                    setName(purpose.name);
                    setIcon(purpose.icon);
                    setColor(purpose.color);
                  }}
                  className={`flex-row items-center gap-1.5 rounded-full border px-3 py-2 ${
                    active ? "border-accent bg-accent-soft" : "border-glass-border bg-glass"
                  }`}
                >
                  <Icon
                    name={purpose.icon}
                    size={14}
                    color={active ? colors.accent : colors.fgMuted}
                  />
                  <Text className={active ? "text-accent" : "text-fg-muted"}>{purpose.name}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text className="text-xs text-fg-subtle">
            Or just type your own below — these only fill in a name and icon.
          </Text>
        </View>
      )}

      <View className="gap-2">
        <Text className="text-sm font-medium text-fg-muted">Fund name</Text>
        <Input
          value={name}
          onChangeText={setName}
          placeholder="e.g. New laptop, Vacation, Property tax"
          placeholderTextColor={colors.fgSubtle}
          className="rounded-lg border border-glass-border bg-glass px-3 py-2 text-base text-fg"
        />
      </View>

      <View className="gap-2">
        <Text className="text-sm font-medium text-fg-muted">
          How much do you need? ({currencySymbol(fundCurrency).trim()})
        </Text>
        <Input
          value={targetText}
          onChangeText={setTargetText}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={colors.fgSubtle}
          className="font-data rounded-lg border border-glass-border bg-glass px-3 py-2 text-lg text-fg"
        />
        <AmountOperatorRow value={targetText} onChange={setTargetText} />
        <Text className="text-xs text-fg-subtle">
          You can put money aside whenever you like — there&rsquo;s no schedule to keep up with.
        </Text>
      </View>

      <View className="gap-2">
        <Text className="text-sm font-medium text-fg-muted">Needed by (optional)</Text>
        <Pressable
          onPress={() => setShowDatePicker(true)}
          className="rounded-lg border border-glass-border bg-glass px-3 py-2"
        >
          <Text className="text-fg">{targetDate ? targetDate.toDateString() : "No date"}</Text>
        </Pressable>
        {targetDate && (
          <Pressable onPress={() => setTargetDate(null)}>
            <Text className="text-xs font-medium text-accent">Clear date</Text>
          </Pressable>
        )}
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

      <Button onPress={handleSubmit} disabled={submitting}>
        {submitLabel}
      </Button>
    </ScrollView>
  );
}
