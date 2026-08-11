import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

import { ACCOUNT_TYPE_ICONS, ACCOUNT_TYPE_LABELS } from "../constants/accountTypes";
import { COLOR_PALETTE } from "../constants/colorPalette";
import { ACCOUNT_TYPES, type AccountType } from "../db/schema";
import { majorToMinor, minorToMajor } from "../services/format";

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
      <Text className="text-sm font-medium text-gray-700">{label}</Text>
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
                ? "border-blue-600 bg-blue-50"
                : "border-gray-200"
            }`}
          >
            <Text
              className={value === optValue ? "text-blue-600" : "text-gray-700"}
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

  function handleSubmit() {
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      type,
      color,
      icon: ACCOUNT_TYPE_ICONS[type],
      currency: currency.trim().toUpperCase() || "INR",
      creditLimitMinor:
        type === "credit_card" && creditLimitText
          ? majorToMinor(Number(creditLimitText), currency)
          : null,
      openingBalanceMinor: majorToMinor(Number(openingBalanceText) || 0, currency),
      openingDate,
      budgetModeEnabled,
      showFutureTxEnabled,
      budgetMonthlyMinor: budgetMonthlyText
        ? majorToMinor(Number(budgetMonthlyText), currency)
        : null,
    });
  }

  return (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 16, gap: 20 }}>
      <View className="gap-2">
        <Text className="text-sm font-medium text-gray-700">Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. HDFC Salary"
          className="rounded-lg border border-gray-200 px-3 py-2 text-base"
        />
      </View>

      <View className="gap-2">
        <Text className="text-sm font-medium text-gray-700">Type</Text>
        <View className="flex-row flex-wrap gap-2">
          {ACCOUNT_TYPES.map((t) => (
            <Pressable
              key={t}
              onPress={() => setType(t)}
              className={`rounded-full border px-3 py-2 ${
                type === t ? "border-blue-600 bg-blue-50" : "border-gray-200"
              }`}
            >
              <Text className={type === t ? "text-blue-600" : "text-gray-700"}>
                {ACCOUNT_TYPE_LABELS[t]}
              </Text>
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
              className={`h-9 w-9 rounded-full ${
                color === c ? "border-2 border-gray-900" : ""
              }`}
            />
          ))}
        </View>
      </View>

      <View className="gap-2">
        <Text className="text-sm font-medium text-gray-700">Currency</Text>
        <TextInput
          value={currency}
          onChangeText={setCurrency}
          autoCapitalize="characters"
          maxLength={3}
          placeholder="INR"
          className="rounded-lg border border-gray-200 px-3 py-2 text-base"
        />
      </View>

      {type === "credit_card" && (
        <View className="gap-2">
          <Text className="text-sm font-medium text-gray-700">Credit Limit</Text>
          <TextInput
            value={creditLimitText}
            onChangeText={setCreditLimitText}
            keyboardType="decimal-pad"
            placeholder="0"
            className="rounded-lg border border-gray-200 px-3 py-2 text-base"
          />
        </View>
      )}

      <View className="gap-2">
        <Text className="text-sm font-medium text-gray-700">Opening Balance</Text>
        <TextInput
          value={openingBalanceText}
          onChangeText={setOpeningBalanceText}
          keyboardType="numbers-and-punctuation"
          placeholder="0"
          className="rounded-lg border border-gray-200 px-3 py-2 text-base"
        />
      </View>

      <View className="gap-2">
        <Text className="text-sm font-medium text-gray-700">Opening Date</Text>
        <Pressable
          onPress={() => setShowDatePicker(true)}
          className="rounded-lg border border-gray-200 px-3 py-2"
        >
          <Text>{openingDate.toDateString()}</Text>
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
              <Text className="text-sm font-medium text-gray-700">
                Monthly Budget
              </Text>
              <TextInput
                value={budgetMonthlyText}
                onChangeText={setBudgetMonthlyText}
                keyboardType="decimal-pad"
                placeholder="0"
                className="rounded-lg border border-gray-200 px-3 py-2 text-base"
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

      <Pressable
        onPress={handleSubmit}
        className="items-center rounded-lg bg-blue-600 py-3"
      >
        <Text className="text-base font-semibold text-white">{submitLabel}</Text>
      </Pressable>
    </ScrollView>
  );
}
