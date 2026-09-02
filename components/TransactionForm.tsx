import { useEffect, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { Input } from "./ui/Input";
import DateTimePicker from "@react-native-community/datetimepicker";

import { AmountOperatorRow } from "./AmountOperatorRow";
import { ALL_ICON_OPTIONS } from "../constants/iconLibrary";
import { Button } from "./ui/Button";
import { COLOR_PALETTE } from "../constants/colorPalette";
import { createCategory } from "../db/actions/categories";
import { useAccounts } from "../db/queries/accounts";
import { useCategories } from "../db/queries/categories";
import { RECURRENCE_UNITS, TRANSACTION_TYPES, type RecurrenceUnit, type TransactionType } from "../db/schema";
import type { RecurringSchedule } from "../services/recurrence";
import { evaluateExpression } from "../services/calculator";
import { majorToMinor, minorToMajor } from "../services/format";
import { useThemeColors } from "../theme/palette";
import { TagPicker } from "./TagPicker";

export interface TransactionFormValues {
  type: TransactionType;
  amountMinor: number;
  date: Date;
  accountId: number;
  toAccountId: number | null;
  categoryId: number | null;
  description: string;
  tagIds: number[];
}

export interface RecurringSeriesInfo {
  scheduleLabel: string;
  endDate: Date | null;
}

interface TransactionFormProps {
  initialValues?: Partial<TransactionFormValues>;
  onSubmit: (values: TransactionFormValues) => void;
  submitLabel: string;
  /** Only meaningful at creation — shows the "Make recurring" toggle. */
  allowRecurring?: boolean;
  /** Called instead of onSubmit when "Make recurring" is checked at creation. */
  onSubmitRecurring?: (values: TransactionFormValues, schedule: RecurringSchedule) => void;
  /** Set when editing an occurrence that's part of a recurring series. */
  recurringInfo?: RecurringSeriesInfo | null;
  /** Called instead of onSubmit once the user picks "just this one" / "this and future". */
  onEditScope?: (scope: "one" | "future", values: TransactionFormValues, newEndDate: Date | null) => void;
}

const TYPE_LABELS: Record<TransactionType, string> = {
  income: "Income",
  expense: "Expense",
  transfer: "Transfer",
};

// The selected type carries its own semantic colour rather than the generic
// accent, so the form says which kind of entry you're making at a glance —
// the same success/danger/transfer tokens the transaction list, summary
// band and home screen widget already use for these three.
const TYPE_STYLES: Record<TransactionType, { selected: string; text: string }> = {
  income: { selected: "border-success bg-success-soft", text: "text-success" },
  expense: { selected: "border-danger bg-danger-soft", text: "text-danger" },
  transfer: { selected: "border-transfer bg-transfer-soft", text: "text-transfer" },
};

const UNIT_LABELS: Record<RecurrenceUnit, string> = {
  day: "day(s)",
  week: "week(s)",
  month: "month(s)",
  year: "year(s)",
};

export function TransactionForm({
  initialValues,
  onSubmit,
  submitLabel,
  allowRecurring = false,
  onSubmitRecurring,
  recurringInfo = null,
  onEditScope,
}: TransactionFormProps) {
  const { data: accounts } = useAccounts();
  const [type, setType] = useState<TransactionType>(initialValues?.type ?? "expense");
  const { data: categories } = useCategories(type === "income" ? "income" : "expense");
  const colors = useThemeColors();

  const [amountText, setAmountText] = useState(() => {
    if (initialValues?.amountMinor == null) return "";
    const initialCurrency =
      accounts?.find((a) => a.id === initialValues.accountId)?.currency ?? "INR";
    return String(minorToMajor(initialValues.amountMinor, initialCurrency));
  });
  // accounts may not be loaded yet on first render, so re-derive the
  // initial amount text once they arrive — guarded to run only once so it
  // never clobbers what the user has since typed.
  const hasSyncedInitialAmount = useRef(false);
  useEffect(() => {
    if (hasSyncedInitialAmount.current) return;
    if (initialValues?.amountMinor == null || !accounts) return;
    hasSyncedInitialAmount.current = true;
    const initialCurrency =
      accounts.find((a) => a.id === initialValues.accountId)?.currency ?? "INR";
    setAmountText(String(minorToMajor(initialValues.amountMinor, initialCurrency)));
  }, [accounts]);
  const [date, setDate] = useState(initialValues?.date ?? new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [accountId, setAccountId] = useState<number | null>(
    initialValues?.accountId ?? null,
  );
  const [toAccountId, setToAccountId] = useState<number | null>(
    initialValues?.toAccountId ?? null,
  );
  const [categoryId, setCategoryId] = useState<number | null>(
    initialValues?.categoryId ?? null,
  );
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [tagIds, setTagIds] = useState<number[]>(initialValues?.tagIds ?? []);
  const [error, setError] = useState<string | null>(null);

  const isRecurringEdit = recurringInfo !== null;
  const [recurring, setRecurring] = useState(false);
  const [intervalCountText, setIntervalCountText] = useState("1");
  const [intervalUnit, setIntervalUnit] = useState<RecurrenceUnit>("month");
  const [scheduleEndDate, setScheduleEndDate] = useState<Date | null>(
    recurringInfo?.endDate ?? null,
  );
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  const selectedAccount = accounts?.find((a) => a.id === accountId);
  const currency = selectedAccount?.currency ?? "INR";

  function handleCreateCategory() {
    if (!newCategoryName.trim()) return;
    const newId = createCategory({
      name: newCategoryName.trim(),
      kind: type === "income" ? "income" : "expense",
      icon: ALL_ICON_OPTIONS[0].key,
      color: COLOR_PALETTE[0],
    });
    setCategoryId(newId);
    setNewCategoryName("");
    setAddingCategory(false);
  }

  // Saving navigates away, but not instantly — the screen stays mounted and
  // the button stays pressable for the whole round trip. Without this guard
  // a quick double-tap wrote a second transaction, and a few impatient taps
  // wrote several: five identical Eating Out rows (ids 94-98, same amount,
  // same date, same account, none recurring) were found in a real database
  // this way. A ref, not state, because two taps in one frame would both
  // read a stale `false` from state before React re-rendered.
  const submittingRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);

  function dispatchOnce(send: () => void) {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      send();
    } catch (submitError) {
      // The caller didn't navigate away, so let the user correct and retry
      // rather than leaving the form permanently locked.
      submittingRef.current = false;
      setSubmitting(false);
      setError(submitError instanceof Error ? submitError.message : "Could not save. Please try again.");
    }
  }

  function handleSubmit() {
    const amount = evaluateExpression(amountText);
    if (amount === null) {
      setError("Enter a valid amount or expression (e.g. 1200+350)");
      return;
    }
    if (amount <= 0) {
      setError("Amount must be greater than 0");
      return;
    }
    if (!accountId) {
      setError(type === "transfer" ? "From account is required" : "Account is required");
      return;
    }
    if (type === "transfer") {
      if (!toAccountId) {
        setError("To account is required");
        return;
      }
      if (toAccountId === accountId) {
        setError("From and to accounts must be different");
        return;
      }
    } else if (!categoryId) {
      setError("Category is required");
      return;
    }

    let schedule: RecurringSchedule | null = null;
    if (!isRecurringEdit && allowRecurring && recurring) {
      const intervalCount = Number(intervalCountText);
      if (!Number.isInteger(intervalCount) || intervalCount < 1) {
        setError("Repeat interval must be a whole number of 1 or more");
        return;
      }
      schedule = { intervalCount, intervalUnit, endDate: scheduleEndDate };
    }
    setError(null);

    const values: TransactionFormValues = {
      type,
      amountMinor: majorToMinor(amount, currency),
      date,
      accountId,
      toAccountId: type === "transfer" ? toAccountId : null,
      categoryId: type === "transfer" ? null : categoryId,
      description: description.trim(),
      tagIds,
    };

    if (isRecurringEdit) {
      Alert.alert("Apply this change to:", undefined, [
        { text: "Just this one", onPress: () => dispatchOnce(() => onEditScope?.("one", values, scheduleEndDate)) },
        {
          text: "This and all future occurrences",
          onPress: () => dispatchOnce(() => onEditScope?.("future", values, scheduleEndDate)),
        },
        { text: "Cancel", style: "cancel" },
      ]);
      return;
    }

    if (schedule) {
      dispatchOnce(() => onSubmitRecurring?.(values, schedule));
      return;
    }

    dispatchOnce(() => onSubmit(values));
  }

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ padding: 16, gap: 20 }}>
      <View className="flex-row gap-2">
        {TRANSACTION_TYPES.map((t) => (
          <Pressable
            key={t}
            onPress={() => setType(t)}
            className={`flex-1 items-center rounded-lg border py-2 ${
              type === t ? TYPE_STYLES[t].selected : "border-glass-border bg-glass"
            }`}
          >
            <Text className={type === t ? `font-medium ${TYPE_STYLES[t].text}` : "text-fg-muted"}>
              {TYPE_LABELS[t]}
            </Text>
          </Pressable>
        ))}
      </View>

      <View className="gap-2">
        <Text className="text-sm font-medium text-fg-muted">Amount</Text>
        <Input
          value={amountText}
          onChangeText={setAmountText}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={colors.fgSubtle}
          className="font-data rounded-lg border border-glass-border bg-glass px-3 py-2 text-lg text-fg"
        />
        <AmountOperatorRow value={amountText} onChange={setAmountText} />
      </View>

      <View className="gap-2">
        <Text className="text-sm font-medium text-fg-muted">
          {type === "transfer" ? "From Account" : "Account"}
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {(accounts ?? []).map((a) => (
            <Pressable
              key={a.id}
              onPress={() => setAccountId(a.id)}
              className={`rounded-full border px-3 py-2 ${
                accountId === a.id ? "border-accent bg-accent-soft" : "border-glass-border bg-glass"
              }`}
            >
              <Text className={accountId === a.id ? "text-accent" : "text-fg-muted"}>
                {a.name}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {type === "transfer" && (
        <View className="gap-2">
          <Text className="text-sm font-medium text-fg-muted">To Account</Text>
          <View className="flex-row flex-wrap gap-2">
            {(accounts ?? [])
              .filter((a) => a.id !== accountId)
              .map((a) => (
                <Pressable
                  key={a.id}
                  onPress={() => setToAccountId(a.id)}
                  className={`rounded-full border px-3 py-2 ${
                    toAccountId === a.id ? "border-transfer bg-transfer-soft" : "border-glass-border bg-glass"
                  }`}
                >
                  <Text className={toAccountId === a.id ? "text-transfer" : "text-fg-muted"}>
                    {a.name}
                  </Text>
                </Pressable>
              ))}
          </View>
        </View>
      )}

      {type !== "transfer" && (
        <View className="gap-2">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-medium text-fg-muted">Category</Text>
            <Pressable onPress={() => setAddingCategory((v) => !v)}>
              <Text className="text-xs font-medium text-accent">
                {addingCategory ? "Cancel" : "+ New category"}
              </Text>
            </Pressable>
          </View>
          <View className="flex-row flex-wrap gap-2">
            {(categories ?? []).map((c) => (
              <Pressable
                key={c.id}
                onPress={() => setCategoryId(c.id)}
                className={`rounded-full border px-3 py-2 ${
                  categoryId === c.id ? "border-accent bg-accent-soft" : "border-glass-border bg-glass"
                }`}
              >
                <Text className={categoryId === c.id ? "text-accent" : "text-fg-muted"}>
                  {c.name}
                </Text>
              </Pressable>
            ))}
          </View>
          {addingCategory && (
            <View className="flex-row gap-2">
              <Input
                value={newCategoryName}
                onChangeText={setNewCategoryName}
                placeholder="Category name"
                placeholderTextColor={colors.fgSubtle}
                className="flex-1 rounded-lg border border-glass-border bg-glass px-3 py-2 text-base text-fg"
              />
              <Pressable
                onPress={handleCreateCategory}
                className="items-center justify-center rounded-lg border border-glass-border bg-glass px-4"
              >
                <Text className="text-fg">Add</Text>
              </Pressable>
            </View>
          )}
        </View>
      )}

      <View className="gap-2">
        <Text className="text-sm font-medium text-fg-muted">Date</Text>
        <Pressable
          onPress={() => setShowDatePicker(true)}
          className="rounded-lg border border-glass-border bg-glass px-3 py-2"
        >
          <Text className="text-fg">{date.toDateString()}</Text>
        </Pressable>
        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            onChange={(_, selected) => {
              setShowDatePicker(false);
              if (selected) setDate(selected);
            }}
          />
        )}
      </View>

      <View className="gap-2">
        <Text className="text-sm font-medium text-fg-muted">Description (optional)</Text>
        <Input
          value={description}
          onChangeText={setDescription}
          placeholder="Add a note"
          placeholderTextColor={colors.fgSubtle}
          className="rounded-lg border border-glass-border bg-glass px-3 py-2 text-base text-fg"
        />
      </View>

      <TagPicker selectedTagIds={tagIds} onChange={setTagIds} />

      {isRecurringEdit && (
        <View className="gap-2 rounded-lg bg-surface-2 p-3">
          <Text className="text-sm text-fg-muted">
            🔁 Part of a recurring series · {recurringInfo!.scheduleLabel}
          </Text>
          <Text className="text-xs text-fg-muted">
            End date (optional — leave blank to repeat indefinitely)
          </Text>
          <Pressable
            onPress={() => setShowEndDatePicker(true)}
            className="rounded-lg border border-glass-border bg-glass px-3 py-2"
          >
            <Text className="text-fg">
              {scheduleEndDate ? scheduleEndDate.toDateString() : "No end date"}
            </Text>
          </Pressable>
          {showEndDatePicker && (
            <DateTimePicker
              value={scheduleEndDate ?? new Date()}
              mode="date"
              onChange={(_, selected) => {
                setShowEndDatePicker(false);
                if (selected) setScheduleEndDate(selected);
              }}
            />
          )}
          <Text className="text-xs text-fg-subtle">
            Only applied if you choose &ldquo;this and all future occurrences&rdquo; below.
          </Text>
        </View>
      )}

      {allowRecurring && !isRecurringEdit && (
        <View className="gap-3 rounded-lg border border-glass-border p-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-base text-fg">Make recurring</Text>
            <Switch
              value={recurring}
              onValueChange={setRecurring}
              trackColor={{ false: colors.glassFill, true: colors.accent }}
              thumbColor="#ffffff"
              ios_backgroundColor={colors.glassFill}
            />
          </View>

          {recurring && (
            <>
              <View className="gap-2">
                <View className="flex-row items-center gap-2">
                  <Text className="text-sm text-fg-muted">Repeat every</Text>
                  <Input
                    value={intervalCountText}
                    onChangeText={setIntervalCountText}
                    keyboardType="number-pad"
                    className="w-16 rounded-lg border border-glass-border bg-glass px-2 py-1.5 text-center text-fg"
                  />
                </View>
                <View className="flex-row flex-wrap gap-1.5">
                  {RECURRENCE_UNITS.map((unit) => (
                    <Pressable
                      key={unit}
                      onPress={() => setIntervalUnit(unit)}
                      className={`rounded-full border px-2.5 py-1.5 ${
                        intervalUnit === unit ? "border-accent bg-accent-soft" : "border-glass-border bg-glass"
                      }`}
                    >
                      <Text className={intervalUnit === unit ? "text-accent" : "text-fg-muted"}>
                        {UNIT_LABELS[unit]}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View className="gap-2">
                <Text className="text-sm text-fg-muted">
                  End date (optional — leave blank to repeat indefinitely)
                </Text>
                <Pressable
                  onPress={() => setShowEndDatePicker(true)}
                  className="rounded-lg border border-glass-border bg-glass px-3 py-2"
                >
                  <Text className="text-fg">
                    {scheduleEndDate ? scheduleEndDate.toDateString() : "No end date"}
                  </Text>
                </Pressable>
                {showEndDatePicker && (
                  <DateTimePicker
                    value={scheduleEndDate ?? new Date()}
                    mode="date"
                    onChange={(_, selected) => {
                      setShowEndDatePicker(false);
                      if (selected) setScheduleEndDate(selected);
                    }}
                  />
                )}
              </View>
            </>
          )}
        </View>
      )}

      {error && <Text className="text-sm text-danger">{error}</Text>}

      <Button onPress={handleSubmit} disabled={submitting}>{submitLabel}</Button>
    </ScrollView>
  );
}
