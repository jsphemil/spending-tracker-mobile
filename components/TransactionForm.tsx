import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

import { useAccounts } from "../db/queries/accounts";
import { useCategories } from "../db/queries/categories";
import { TRANSACTION_TYPES, type TransactionType } from "../db/schema";
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

interface TransactionFormProps {
  initialValues?: Partial<TransactionFormValues>;
  onSubmit: (values: TransactionFormValues) => void;
  submitLabel: string;
}

const TYPE_LABELS: Record<TransactionType, string> = {
  income: "Income",
  expense: "Expense",
  transfer: "Transfer",
};

export function TransactionForm({
  initialValues,
  onSubmit,
  submitLabel,
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
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [tagIds, setTagIds] = useState<number[]>(initialValues?.tagIds ?? []);
  const [error, setError] = useState<string | null>(null);

  const selectedAccount = accounts?.find((a) => a.id === accountId);
  const currency = selectedAccount?.currency ?? "INR";

  function handleSubmit() {
    const amount = Number(amountText);
    if (!Number.isFinite(amount) || amount <= 0) {
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
    setError(null);

    onSubmit({
      type,
      amountMinor: majorToMinor(amount, currency),
      date,
      accountId,
      toAccountId: type === "transfer" ? toAccountId : null,
      categoryId: type === "transfer" ? null : categoryId,
      description: description.trim(),
      tagIds,
    });
  }

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ padding: 16, gap: 20 }}>
      <View className="flex-row gap-2">
        {TRANSACTION_TYPES.map((t) => (
          <Pressable
            key={t}
            onPress={() => setType(t)}
            className={`flex-1 items-center rounded-lg border py-2 ${
              type === t ? "border-accent bg-accent-soft" : "border-border bg-surface"
            }`}
          >
            <Text className={type === t ? "text-accent" : "text-fg-muted"}>
              {TYPE_LABELS[t]}
            </Text>
          </Pressable>
        ))}
      </View>

      <View className="gap-2">
        <Text className="text-sm font-medium text-fg-muted">Amount</Text>
        <TextInput
          value={amountText}
          onChangeText={setAmountText}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={colors.fgSubtle}
          className="font-data rounded-lg border border-border bg-surface px-3 py-2 text-lg text-fg"
        />
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
                accountId === a.id ? "border-accent bg-accent-soft" : "border-border bg-surface"
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
                    toAccountId === a.id ? "border-transfer bg-transfer-soft" : "border-border bg-surface"
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
          <Text className="text-sm font-medium text-fg-muted">Category</Text>
          <View className="flex-row flex-wrap gap-2">
            {(categories ?? []).map((c) => (
              <Pressable
                key={c.id}
                onPress={() => setCategoryId(c.id)}
                className={`rounded-full border px-3 py-2 ${
                  categoryId === c.id ? "border-accent bg-accent-soft" : "border-border bg-surface"
                }`}
              >
                <Text className={categoryId === c.id ? "text-accent" : "text-fg-muted"}>
                  {c.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      <View className="gap-2">
        <Text className="text-sm font-medium text-fg-muted">Date</Text>
        <Pressable
          onPress={() => setShowDatePicker(true)}
          className="rounded-lg border border-border bg-surface px-3 py-2"
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
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Add a note"
          placeholderTextColor={colors.fgSubtle}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-base text-fg"
        />
      </View>

      <TagPicker selectedTagIds={tagIds} onChange={setTagIds} />

      {error && <Text className="text-sm text-danger">{error}</Text>}

      <Pressable
        onPress={handleSubmit}
        className="items-center rounded-lg bg-accent py-3"
      >
        <Text className="text-base font-semibold text-white">{submitLabel}</Text>
      </Pressable>
    </ScrollView>
  );
}
