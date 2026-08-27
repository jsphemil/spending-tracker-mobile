import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

import { AmountOperatorRow } from "./AmountOperatorRow";
import { ACCOUNT_TYPE_ICONS, ACCOUNT_TYPE_LABELS } from "../constants/accountTypes";
import { COLOR_PALETTE } from "../constants/colorPalette";
import { CURRENCY_OPTIONS } from "../constants/currencies";
import { ACCOUNT_TYPES, type AccountType } from "../db/schema";
import { evaluateExpression } from "../services/calculator";
import { majorToMinor, minorToMajor } from "../services/format";
import { useThemeColors } from "../theme/palette";
import { Button } from "./ui/Button";
import { IconPicker } from "./ui/IconPicker";

export interface AccountFormValues {
  name: string;
  type: AccountType;
  color: string;
  icon: string;
  currency: string;
  creditLimitMinor: number | null;
  openingBalanceMinor: number;
  openingDate: Date;
  budgetModeEnabled: boolean | null;
  showFutureTxEnabled: boolean | null;
  budgetMonthlyMinor: number | null;
}

interface AccountFormProps {
  mode: "create" | "edit";
  initialValues?: Partial<AccountFormValues>;
  onSubmit: (values: AccountFormValues) => void;
  submitLabel: string;
}

function TriStateRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean | null;
  onChange: (value: boolean | null) => void;
}) {
  return (
    <View className="gap-2">
      <Text className="text-sm font-medium text-fg-muted">{label}</Text>
      <View className="flex-row gap-2">
        {(
          [
            ["Inherit global", null],
            ["On", true],
            ["Off", false],
          ] as const
        ).map(([optLabel, optValue]) => (
          <Pressable
            key={optLabel}
            onPress={() => onChange(optValue)}
            className={`flex-1 items-center rounded-lg border py-2 ${
              value === optValue
                ? "border-accent bg-accent-soft"
                : "border-glass-border bg-glass"
            }`}
          >
            <Text
              className={value === optValue ? "text-accent" : "text-fg-muted"}
            >
              {optLabel}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function AccountForm({
  mode,
  initialValues,
  onSubmit,
  submitLabel,
}: AccountFormProps) {
  const [name, setName] = useState(initialValues?.name ?? "");
  const [type, setType] = useState<AccountType>(initialValues?.type ?? "savings");
  // Historically auto-derived from `type` with no user choice at all
  // (ACCOUNT_TYPE_ICONS[type] on every submit). Now user-selectable via
  // IconPicker: still defaults to the type's icon, but a manual pick is
  // preserved when the user then changes account type (see the Type
  // Pressable's onPress below).
  const [icon, setIcon] = useState(initialValues?.icon ?? ACCOUNT_TYPE_ICONS[initialValues?.type ?? "savings"]);
  const [color, setColor] = useState(initialValues?.color ?? COLOR_PALETTE[0]);
  const [currency, setCurrency] = useState(initialValues?.currency ?? "INR");
  const [creditLimitText, setCreditLimitText] = useState(
    initialValues?.creditLimitMinor != null
      ? String(minorToMajor(initialValues.creditLimitMinor, currency))
      : "",
  );
  const [openingBalanceText, setOpeningBalanceText] = useState(
    initialValues?.openingBalanceMinor != null
      ? String(minorToMajor(initialValues.openingBalanceMinor, currency))
      : "0",
  );
  const [openingDate, setOpeningDate] = useState(
    initialValues?.openingDate ?? new Date(),
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [budgetModeEnabled, setBudgetModeEnabled] = useState<boolean | null>(
    initialValues?.budgetModeEnabled ?? null,
  );
  const [showFutureTxEnabled, setShowFutureTxEnabled] = useState<boolean | null>(
    initialValues?.showFutureTxEnabled ?? null,
  );
  const [budgetMonthlyText, setBudgetMonthlyText] = useState(
    initialValues?.budgetMonthlyMinor != null
      ? String(minorToMajor(initialValues.budgetMonthlyMinor, currency))
      : "",
  );
  const colors = useThemeColors();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    const normalizedCurrency = currency.trim().toUpperCase();
    if (normalizedCurrency.length !== 3) {
      setError("Use a 3-letter currency code");
      return;
    }
    const creditLimitNum = creditLimitText ? Number(creditLimitText) : null;
    if (type === "credit_card" && !(creditLimitNum !== null && creditLimitNum > 0)) {
      setError("Credit limit is required for a credit card account and must be greater than 0");
      return;
    }
    const budgetNum = budgetMonthlyText ? Number(budgetMonthlyText) : null;
    if (budgetNum !== null && !(budgetNum > 0)) {
      setError("Monthly budget must be greater than 0");
      return;
    }
    const openingBalanceNum = openingBalanceText.trim() ? evaluateExpression(openingBalanceText) : 0;
    if (openingBalanceNum === null) {
      setError("Enter a valid opening balance or expression (e.g. 1000-250)");
      return;
    }
    setError(null);

    onSubmit({
      name: name.trim(),
      type,
      color,
      icon,
      currency: normalizedCurrency,
      creditLimitMinor:
        type === "credit_card" && creditLimitNum !== null
          ? majorToMinor(creditLimitNum, normalizedCurrency)
          : null,
      openingBalanceMinor: majorToMinor(openingBalanceNum, normalizedCurrency),
      openingDate,
      budgetModeEnabled,
      showFutureTxEnabled,
      budgetMonthlyMinor:
        budgetNum !== null ? majorToMinor(budgetNum, normalizedCurrency) : null,
    });
  }

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ padding: 16, gap: 20 }}>
      <View className="gap-2">
        <Text className="text-sm font-medium text-fg-muted">Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. HDFC Salary"
          placeholderTextColor={colors.fgSubtle}
          className="rounded-lg border border-glass-border bg-glass px-3 py-2 text-base text-fg"
        />
      </View>

      <View className="gap-2">
        <Text className="text-sm font-medium text-fg-muted">Type</Text>
        <View className="flex-row flex-wrap gap-2">
          {ACCOUNT_TYPES.map((t) => (
            <Pressable
              key={t}
              onPress={() => {
                // Only follow the type's default icon while the user hasn't
                // picked their own — once icon !== the previous type's
                // default, treat it as an intentional override.
                setIcon((prev) => (prev === ACCOUNT_TYPE_ICONS[type] ? ACCOUNT_TYPE_ICONS[t] : prev));
                setType(t);
              }}
              className={`rounded-full border px-3 py-2 ${
                type === t ? "border-accent bg-accent-soft" : "border-glass-border bg-glass"
              }`}
            >
              <Text className={type === t ? "text-accent" : "text-fg-muted"}>
                {ACCOUNT_TYPE_LABELS[t]}
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
              className={`h-9 w-9 rounded-full ${
                color === c ? "border-2 border-fg" : ""
              }`}
            />
          ))}
        </View>
      </View>

      <View className="gap-2">
        <Text className="text-sm font-medium text-fg-muted">Currency</Text>
        <View className="flex-row flex-wrap gap-2">
          {CURRENCY_OPTIONS.map((opt) => (
            <Pressable
              key={opt.code}
              onPress={() => setCurrency(opt.code)}
              className={`rounded-full border px-3 py-1.5 ${
                currency.toUpperCase() === opt.code
                  ? "border-accent bg-accent-soft"
                  : "border-glass-border bg-glass"
              }`}
            >
              <Text className={currency.toUpperCase() === opt.code ? "text-accent" : "text-fg-muted"}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          value={currency}
          onChangeText={setCurrency}
          autoCapitalize="characters"
          maxLength={3}
          placeholder="Or type any 3-letter code"
          placeholderTextColor={colors.fgSubtle}
          className="rounded-lg border border-glass-border bg-glass px-3 py-2 text-base text-fg"
        />
      </View>

      {type === "credit_card" && (
        <View className="gap-2">
          <Text className="text-sm font-medium text-fg-muted">Credit Limit</Text>
          <TextInput
            value={creditLimitText}
            onChangeText={setCreditLimitText}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={colors.fgSubtle}
            className="rounded-lg border border-glass-border bg-glass px-3 py-2 text-base text-fg"
          />
        </View>
      )}

      <View className="gap-2">
        <Text className="text-sm font-medium text-fg-muted">Opening Balance</Text>
        <TextInput
          value={openingBalanceText}
          onChangeText={setOpeningBalanceText}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor={colors.fgSubtle}
          className="rounded-lg border border-glass-border bg-glass px-3 py-2 text-base text-fg"
        />
        <AmountOperatorRow value={openingBalanceText} onChange={setOpeningBalanceText} />
      </View>

      <View className="gap-2">
        <Text className="text-sm font-medium text-fg-muted">Opening Date</Text>
        <Pressable
          onPress={() => setShowDatePicker(true)}
          className="rounded-lg border border-glass-border bg-glass px-3 py-2"
        >
          <Text className="text-fg">{openingDate.toDateString()}</Text>
        </Pressable>
        {showDatePicker && (
          <DateTimePicker
            value={openingDate}
            mode="date"
            onChange={(_, date) => {
              setShowDatePicker(false);
              if (date) setOpeningDate(date);
            }}
          />
        )}
      </View>

      {mode === "edit" && (
        <>
          <TriStateRow
            label="Budget Mode"
            value={budgetModeEnabled}
            onChange={setBudgetModeEnabled}
          />
          {budgetModeEnabled === true && (
            <View className="gap-2">
              <Text className="text-sm font-medium text-fg-muted">
                Monthly Budget
              </Text>
              <TextInput
                value={budgetMonthlyText}
                onChangeText={setBudgetMonthlyText}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={colors.fgSubtle}
                className="rounded-lg border border-glass-border bg-glass px-3 py-2 text-base text-fg"
              />
            </View>
          )}
          <TriStateRow
            label="Show Future Transactions"
            value={showFutureTxEnabled}
            onChange={setShowFutureTxEnabled}
          />
        </>
      )}

      {error && <Text className="text-sm text-danger">{error}</Text>}

      <Button onPress={handleSubmit}>{submitLabel}</Button>
    </ScrollView>
  );
}
