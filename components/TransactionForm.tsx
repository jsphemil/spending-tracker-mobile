import { useEffect, useRef, useState } from "react";
import { Alert, Pressable, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FormScrollView } from "./ui/FormScrollView";
import { Input } from "./ui/Input";
import DateTimePicker from "@react-native-community/datetimepicker";

import { ALL_ICON_OPTIONS } from "../constants/iconLibrary";
import { BottomSheet } from "./ui/BottomSheet";
import { Button } from "./ui/Button";
import { CalculatorKeypad } from "./ui/CalculatorKeypad";
import { Chip } from "./ui/Chip";
import { COLOR_PALETTE } from "../constants/colorPalette";
import { createCategory } from "../db/actions/categories";
import { useAccounts } from "../db/queries/accounts";
import { useCategories } from "../db/queries/categories";
import { useFunds } from "../db/queries/funds";
import {
  useCategoryUsageOrder,
  useFrequentAmountsForCategory,
  useLastUsedAccountForCategory,
} from "../db/queries/transactions";
import { Icon } from "./ui/Icon";
import { RECURRENCE_UNITS, TRANSACTION_TYPES, type RecurrenceUnit, type TransactionType } from "../db/schema";
import { describeSchedule, type RecurringSchedule } from "../services/recurrence";
import { evaluateExpression } from "../services/calculator";
import { currencySymbol, formatMoney, majorToMinor, minorToMajor, minorUnitsFor } from "../services/format";
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
  fundId: number | null;
}

export interface RecurringSeriesInfo {
  scheduleLabel: string;
  endDate: Date | null;
}

interface TransactionFormProps {
  initialValues?: Partial<TransactionFormValues>;
  onSubmit: (values: TransactionFormValues) => void;
  submitLabel: string;
  /** Only meaningful at creation — shows the "Make recurring" toggle, and
   * doubles as the "this is the create screen" signal that opens the
   * calculator keypad automatically (the edit screen never passes this). */
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

const GENERIC_QUICK_AMOUNTS: Record<TransactionType, number[]> = {
  expense: [100, 500, 1000, 5000],
  transfer: [1000, 5000, 10000, 25000],
  income: [],
};

const OP_REGEX = /[+\-*/]/;

type SheetKind = "account" | "toAccount" | "date" | "categoryMore" | "fund" | "tags" | "repeat";

function shortDate(d: Date): string {
  const startOfDay = (x: Date) => {
    const c = new Date(x);
    c.setHours(0, 0, 0, 0);
    return c.getTime();
  };
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (startOfDay(d) === startOfDay(today)) return "Today";
  if (startOfDay(d) === startOfDay(yesterday)) return "Yesterday";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

// A compact pick-row opening a bottom sheet — replaces a full-width
// wrapping chip list for Account/Date/To-account (handoff §2).
function FieldChip({
  icon,
  iconBg,
  label,
  value,
  onPress,
}: {
  icon: string;
  iconBg: string;
  label: string;
  value: string;
  onPress: () => void;
}) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${value}`}
      className="flex-1 flex-row items-center gap-2.5 rounded-xl border border-glass-border bg-glass px-3 py-2.5"
    >
      <View style={{ backgroundColor: iconBg }} className="h-8 w-8 items-center justify-center rounded-lg">
        <Icon name={icon} size={15} color="#fff" />
      </View>
      <View className="flex-1">
        <Text className="text-[11px] text-fg-muted" numberOfLines={1}>
          {label}
        </Text>
        <Text className="text-sm font-medium text-fg" numberOfLines={1}>
          {value}
        </Text>
      </View>
      <Icon name="chevron-right" size={16} color={colors.fgMuted} />
    </Pressable>
  );
}

function CategoryTile({
  icon,
  color,
  name,
  selected,
  onPress,
}: {
  icon: string;
  color: string;
  name: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={{ width: "23%" }}
      className={`items-center gap-1.5 rounded-xl border py-2.5 ${
        selected ? "border-accent bg-accent-soft" : "border-glass-border bg-glass"
      }`}
    >
      <View style={{ backgroundColor: color }} className="h-9 w-9 items-center justify-center rounded-lg">
        <Icon name={icon} size={17} color="#fff" />
      </View>
      <Text numberOfLines={1} className={`text-[11px] ${selected ? "font-semibold text-accent" : "text-fg-muted"}`}>
        {name}
      </Text>
    </Pressable>
  );
}

function ExtraButton({ icon, label, set, onPress }: { icon: string; label: string; set: boolean; onPress: () => void }) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: set }}
      className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-lg border px-2 py-2.5 ${
        set ? "border-accent bg-accent-soft" : "border-glass-border"
      }`}
    >
      <Icon name={icon} size={14} color={set ? colors.accent : colors.fgMuted} />
      <Text numberOfLines={1} className={`text-xs font-medium ${set ? "text-accent" : "text-fg-muted"}`}>
        {label}
      </Text>
    </Pressable>
  );
}

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
  const categoryKind = type === "income" ? "income" : "expense";
  const { data: categories } = useCategories(categoryKind);
  const { data: usageRows } = useCategoryUsageOrder(categoryKind);
  const { data: funds } = useFunds();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  // Closed funds are excluded — picking one would earmark against a fund
  // the user has already wound up. An expense already linked to a fund that
  // was closed since keeps its link; only the picker hides it.
  const activeFunds = (funds ?? []).filter((f) => f.status === "active");

  const [amountText, setAmountText] = useState(() => {
    if (initialValues?.amountMinor == null) return "";
    const initialCurrency =
      accounts?.find((a) => a.id === initialValues.accountId)?.currency ?? "INR";
    return String(minorToMajor(Math.abs(initialValues.amountMinor), initialCurrency));
  });
  // A refund is stored as an expense with a negative amount, so every
  // expense total, category breakdown, budget and balance (the widgets'
  // Kotlin SQL included) nets it with no special case. The form edits the
  // absolute amount and this flag.
  const [isRefund, setIsRefund] = useState(
    initialValues?.type === "expense" && (initialValues.amountMinor ?? 0) < 0,
  );
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
    // Deliberate: the amount can only be formatted once the account's
    // currency is known, and accounts arrive asynchronously. The ref guard
    // above means this runs at most once and never overwrites typed input,
    // so the extra render is a one-off on open, not a cascade.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAmountText(String(minorToMajor(Math.abs(initialValues.amountMinor), initialCurrency)));
    // Runs once, guarded by the ref above; initialValues is captured on
    // purpose so later prop churn can't clobber what the user has typed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const [newCategoryName, setNewCategoryName] = useState("");
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [tagIds, setTagIds] = useState<number[]>(initialValues?.tagIds ?? []);
  const [fundId, setFundId] = useState<number | null>(initialValues?.fundId ?? null);
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

  // Opens on new entries (allowRecurring is only ever passed by the create
  // screen), starts closed on edit — opens on tap of the amount field.
  const [keypadOpen, setKeypadOpen] = useState(allowRecurring);
  const [sheet, setSheet] = useState<SheetKind | null>(null);

  function openSheet(kind: SheetKind) {
    setKeypadOpen(false);
    setSheet(kind);
  }
  function openKeypad() {
    setSheet(null);
    setKeypadOpen(true);
  }

  // "Last used here": picking a category pre-selects the account it was
  // most recently used with. Never overrides an account the screen was
  // opened with (a deep-link param, a duplicate, or an edit) — only a
  // category picked from here can trigger it, and only while the current
  // slot is empty or itself came from a previous auto-pick.
  const initialAccountProvidedRef = useRef(initialValues?.accountId != null);
  const [accountAutoPicked, setAccountAutoPicked] = useState(false);
  const lastUsedAccountId = useLastUsedAccountForCategory(categoryId ?? -1);
  useEffect(() => {
    if (initialAccountProvidedRef.current) return;
    if (categoryId === null || lastUsedAccountId === undefined) return;
    if (accountId !== null && !accountAutoPicked) return;
    // Synchronizing with the query result as it arrives (same pattern, and
    // same justification, as the initial-amount-sync effect above) rather
    // than deriving it inline — categoryId/lastUsedAccountId genuinely
    // change on their own schedule, not every render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAccountId(lastUsedAccountId);
    setAccountAutoPicked(true);
    // accountAutoPicked is read, not written, by this effect's guard —
    // including it would refire the moment it flips true for no reason.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId, lastUsedAccountId, accountId]);

  const { data: frequentAmountRows } = useFrequentAmountsForCategory(categoryId ?? -1);
  const expressionHasTrailingOperator = OP_REGEX.test(amountText.slice(-1));
  const quickAmounts = frequentAmountRows?.length
    ? frequentAmountRows.map((r) => minorToMajor(r.amountMinor, currency))
    : GENERIC_QUICK_AMOUNTS[type];
  const selectedCategoryName = categories?.find((c) => c.id === categoryId)?.name;
  const quickAmountsLabel = expressionHasTrailingOperator
    ? "Tap to add to the sum"
    : frequentAmountRows?.length && selectedCategoryName
      ? `Frequent for ${selectedCategoryName}`
      : "Quick amounts";

  function tapQuickAmount(major: number) {
    const str = String(major);
    setAmountText((prev) => (OP_REGEX.test(prev.slice(-1)) ? prev + str : str));
  }

  // Top 7 by usage, swapping in the selected category if it didn't make
  // the cut (ranked lower, brand new, or picked from "More").
  const usageList = usageRows ?? [];
  let gridCategories = usageList.slice(0, 7);
  if (categoryId !== null && !gridCategories.some((c) => c.id === categoryId)) {
    const selected = categories?.find((c) => c.id === categoryId);
    if (selected) {
      gridCategories = [...gridCategories.slice(0, 6), { ...selected, useCount: 0 }];
    }
  }
  const showMoreTile = (categories?.length ?? 0) > gridCategories.length;

  function handleCreateCategory() {
    if (!newCategoryName.trim()) return;
    const newId = createCategory({
      name: newCategoryName.trim(),
      kind: categoryKind,
      icon: ALL_ICON_OPTIONS[0].key,
      color: COLOR_PALETTE[0],
    });
    setCategoryId(newId);
    setNewCategoryName("");
    setSheet(null);
  }

  function pickCategory(id: number) {
    setCategoryId(id);
    setSheet(null);
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
      amountMinor: majorToMinor(amount, currency) * (type === "expense" && isRefund ? -1 : 1),
      date,
      accountId,
      toAccountId: type === "transfer" ? toAccountId : null,
      categoryId: type === "transfer" ? null : categoryId,
      description: description.trim(),
      tagIds,
      // Only expenses spend from a fund; the action layer forces this null
      // for the other types too, so switching type can't strand a link.
      fundId: type === "expense" ? fundId : null,
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

  // Mirrors handleSubmit's validation, without setting `error` — used only
  // to decide what the keypad's ACT key currently means.
  const amountValue = evaluateExpression(amountText);
  const expressionOpen =
    OP_REGEX.test(amountText) && !expressionHasTrailingOperator && amountValue !== null && amountText.length > 0;
  const canQuickSave =
    amountValue !== null &&
    amountValue > 0 &&
    accountId !== null &&
    (type === "transfer" ? toAccountId !== null && toAccountId !== accountId : categoryId !== null);
  const actLabel = expressionOpen
    ? "="
    : canQuickSave
      ? `Save · ${formatMoney(majorToMinor(amountValue ?? 0, currency), currency)}`
      : "Next";

  function handleAct() {
    if (expressionOpen) {
      setAmountText(amountValue !== null ? String(amountValue) : "");
      return;
    }
    if (canQuickSave) {
      handleSubmit();
      return;
    }
    // "Next": close the keypad and point at what's missing. shortcut: no
    // shake/scroll-into-view nudge like the mockup — the field is already
    // visible once the keypad closes, except the To-account sheet, which
    // this opens directly.
    setKeypadOpen(false);
    if (type === "transfer" && !toAccountId) setSheet("toAccount");
  }

  const fundLabel = fundId !== null ? (funds ?? []).find((f) => f.id === fundId)?.name ?? "Fund" : "Fund";
  const tagsLabel = tagIds.length ? `${tagIds.length} tag${tagIds.length > 1 ? "s" : ""}` : "Tags";
  const repeatLabel = isRecurringEdit
    ? recurringInfo!.endDate
      ? `${recurringInfo!.scheduleLabel} · till ${recurringInfo!.endDate.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "2-digit" })}`
      : recurringInfo!.scheduleLabel
    : recurring
      ? (() => {
          const n = Number(intervalCountText) || 1;
          const base = describeSchedule(n, intervalUnit);
          return scheduleEndDate
            ? `${base} · till ${scheduleEndDate.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "2-digit" })}`
            : base;
        })()
      : "Repeat";
  const showRepeatButton = allowRecurring || isRecurringEdit;

  const saveLabel = `${submitLabel}${
    amountValue !== null && amountValue > 0 ? ` · ${formatMoney(majorToMinor(amountValue, currency), currency)}` : ""
  }`;

  return (
    <View className="flex-1">
      <FormScrollView contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 24 }}>
        <View className="flex-row gap-2">
          {TRANSACTION_TYPES.map((t) => (
            <Pressable
              key={t}
              onPress={() => {
                setType(t);
                setCategoryId(null);
                setAccountAutoPicked(false);
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected: type === t }}
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

        <View className="gap-2 rounded-xl border border-glass-border bg-glass p-3">
          <Pressable
            onPress={openKeypad}
            accessibilityRole="button"
            accessibilityLabel={`Amount, ${amountText || "0"}`}
            className="flex-row items-center gap-2 rounded-lg border border-glass-border bg-bg px-3 py-3"
          >
            <Text className="text-xl font-semibold text-fg-muted">{currencySymbol(currency).trim()}</Text>
            <Text className={`font-data flex-1 text-2xl font-bold ${amountText ? "text-fg" : "text-fg-subtle"}`} numberOfLines={1}>
              {amountText || "0"}
            </Text>
          </Pressable>
          {expressionOpen && amountValue !== null && (
            <Text className="px-1 text-xs text-fg-muted">
              = {currencySymbol(currency)}{amountValue.toLocaleString()}
            </Text>
          )}
          {quickAmounts.length > 0 && (
            <View className="gap-1.5">
              <Text className="px-1 text-xs text-fg-muted">{quickAmountsLabel}</Text>
              <View className="flex-row flex-wrap gap-2">
                {quickAmounts.map((major) => (
                  <Pressable
                    key={major}
                    onPress={() => tapQuickAmount(major)}
                    className="rounded-full border border-glass-border bg-bg px-3 py-1.5"
                  >
                    <Text className="text-xs font-medium text-fg">
                      {expressionHasTrailingOperator ? "+ " : ""}
                      {formatMoney(majorToMinor(major, currency), currency)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </View>

        <View className="flex-row gap-2">
          <FieldChip
            icon={selectedAccount?.icon ?? "wallet"}
            iconBg={selectedAccount?.color ?? colors.accent}
            label={type === "transfer" ? "From account" : accountAutoPicked ? "Last used here" : "Account"}
            value={selectedAccount?.name ?? "Choose account"}
            onPress={() => openSheet("account")}
          />
          <FieldChip icon="calendar" iconBg={colors.accent} label="Date" value={shortDate(date)} onPress={() => openSheet("date")} />
        </View>

        {type === "transfer" ? (
          <FieldChip
            icon={accounts?.find((a) => a.id === toAccountId)?.icon ?? "wallet"}
            iconBg={accounts?.find((a) => a.id === toAccountId)?.color ?? colors.transfer}
            label="To account"
            value={accounts?.find((a) => a.id === toAccountId)?.name ?? "Choose account"}
            onPress={() => openSheet("toAccount")}
          />
        ) : (
          <View className="gap-2">
            <Text className="text-sm font-medium text-fg-muted">Category</Text>
            <View className="flex-row flex-wrap gap-2">
              {gridCategories.map((c) => (
                <CategoryTile
                  key={c.id}
                  icon={c.icon}
                  color={c.color}
                  name={c.name}
                  selected={categoryId === c.id}
                  onPress={() => pickCategory(c.id)}
                />
              ))}
              {showMoreTile && (
                <Pressable
                  onPress={() => openSheet("categoryMore")}
                  style={{ width: "23%" }}
                  className="items-center gap-1.5 rounded-xl border border-glass-border bg-glass py-2.5"
                >
                  <View className="h-9 w-9 items-center justify-center rounded-lg bg-surface-2">
                    <Icon name="dots-horizontal" size={17} color={colors.fgMuted} />
                  </View>
                  <Text className="text-[11px] text-fg-muted">More</Text>
                </Pressable>
              )}
            </View>
          </View>
        )}

        <View className="gap-2">
          <Text className="text-sm font-medium text-fg-muted">Description (optional)</Text>
          <Input
            value={description}
            onChangeText={setDescription}
            onFocus={() => setKeypadOpen(false)}
            placeholder="Add a note"
            placeholderTextColor={colors.fgSubtle}
            className="rounded-lg border border-glass-border bg-glass px-3 py-2 text-base text-fg"
          />
        </View>

        {type === "expense" && isRefund && (
          <Text className="-mb-2 text-xs text-fg-muted">
            Refund: puts the money back in the account and lowers this category&rsquo;s spending. It isn&rsquo;t counted as income.
          </Text>
        )}
        <View className="flex-row gap-2">
          {type === "expense" && activeFunds.length > 0 && (
            <ExtraButton icon="piggy-bank" label={fundLabel} set={fundId !== null} onPress={() => openSheet("fund")} />
          )}
          {/* A refund is one-off: never on a recurring series (it would make
              a negative commitment), so Refund and Repeat exclude each other. */}
          {type === "expense" && !isRecurringEdit && !recurring && (
            <ExtraButton icon="refund" label="Refund" set={isRefund} onPress={() => setIsRefund((v) => !v)} />
          )}
          <ExtraButton icon="tag-outline" label={tagsLabel} set={tagIds.length > 0} onPress={() => openSheet("tags")} />
          {showRepeatButton && !(type === "expense" && isRefund) && (
            <ExtraButton icon="repeat" label={repeatLabel} set={recurring || isRecurringEdit} onPress={() => openSheet("repeat")} />
          )}
        </View>
      </FormScrollView>

      <View
        className="border-t border-glass-border bg-bg px-4 pt-3"
        style={{ paddingBottom: insets.bottom + 12 }}
        accessibilityElementsHidden={keypadOpen}
        importantForAccessibility={keypadOpen ? "no-hide-descendants" : "auto"}
      >
        {error && <Text className="mb-2 text-sm text-danger">{error}</Text>}
        <Button onPress={handleSubmit} disabled={submitting}>
          {saveLabel}
        </Button>
      </View>

      {keypadOpen && (
        <View style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}>
          <CalculatorKeypad
            value={amountText}
            onChange={setAmountText}
            minorUnits={minorUnitsFor(currency)}
            onAct={handleAct}
            actLabel={actLabel}
            actIsEquals={expressionOpen}
            onHide={() => setKeypadOpen(false)}
          />
        </View>
      )}

      {sheet === "account" && (
        <BottomSheet title={type === "transfer" ? "From account" : "Account"} onClose={() => setSheet(null)}>
          <View className="gap-2 px-5 pb-4">
            {(accounts ?? []).map((a) => (
              <Chip
                key={a.id}
                label={a.name}
                selected={accountId === a.id}
                onPress={() => {
                  setAccountId(a.id);
                  setAccountAutoPicked(false);
                  setSheet(null);
                }}
              />
            ))}
          </View>
        </BottomSheet>
      )}

      {sheet === "toAccount" && (
        <BottomSheet title="To account" onClose={() => setSheet(null)}>
          <View className="gap-2 px-5 pb-4">
            {(accounts ?? [])
              .filter((a) => a.id !== accountId)
              .map((a) => (
                <Chip
                  key={a.id}
                  label={a.name}
                  tone="transfer"
                  selected={toAccountId === a.id}
                  onPress={() => {
                    setToAccountId(a.id);
                    setSheet(null);
                  }}
                />
              ))}
          </View>
        </BottomSheet>
      )}

      {sheet === "date" && (
        <BottomSheet title="Date" onClose={() => setSheet(null)}>
          <View className="gap-2 px-5 pb-4">
            <Pressable
              onPress={() => {
                setDate(new Date());
                setSheet(null);
              }}
              className="rounded-lg border border-glass-border bg-glass px-3 py-3"
            >
              <Text className="text-fg">Today</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                const d = new Date();
                d.setDate(d.getDate() - 1);
                setDate(d);
                setSheet(null);
              }}
              className="rounded-lg border border-glass-border bg-glass px-3 py-3"
            >
              <Text className="text-fg">Yesterday</Text>
            </Pressable>
            <Pressable
              onPress={() => setShowDatePicker(true)}
              className="rounded-lg border border-glass-border bg-glass px-3 py-3"
            >
              <Text className="text-fg">Pick a date…</Text>
            </Pressable>
          </View>
        </BottomSheet>
      )}
      {showDatePicker && (
        <DateTimePicker
          value={date}
          mode="date"
          onChange={(_, selected) => {
            setShowDatePicker(false);
            setSheet(null);
            if (selected) setDate(selected);
          }}
        />
      )}

      {sheet === "categoryMore" && (
        <BottomSheet title="All categories" onClose={() => setSheet(null)}>
          <View className="flex-row flex-wrap gap-2 px-5 pb-2">
            {(categories ?? []).map((c) => (
              <CategoryTile
                key={c.id}
                icon={c.icon}
                color={c.color}
                name={c.name}
                selected={categoryId === c.id}
                onPress={() => pickCategory(c.id)}
              />
            ))}
          </View>
          <View className="flex-row gap-2 px-5 pb-4 pt-2">
            <Input
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              placeholder="New category name"
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
        </BottomSheet>
      )}

      {sheet === "fund" && (
        <BottomSheet title="Spend from a fund (optional)" onClose={() => setSheet(null)}>
          <View className="gap-3 px-5 pb-4">
            <View className="flex-row flex-wrap gap-2">
              <Chip
                label="None"
                selected={fundId === null}
                onPress={() => {
                  setFundId(null);
                  setSheet(null);
                }}
              />
              {activeFunds.map((f) => (
                <Chip
                  key={f.id}
                  label={f.name}
                  role="checkbox"
                  selected={fundId === f.id}
                  icon={<Icon name={f.icon} size={14} color={fundId === f.id ? colors.accent : colors.fgMuted} />}
                  onPress={() => {
                    setFundId(f.id);
                    setSheet(null);
                  }}
                />
              ))}
            </View>
            {fundId !== null && (
              <Text className="text-xs text-fg-subtle">
                {isRecurringEdit || recurring
                  ? "Each occurrence draws down that fund as its date arrives — future ones don't take the money early."
                  : "This expense will draw down that fund. Editing or deleting it later puts the money back automatically."}
              </Text>
            )}
          </View>
        </BottomSheet>
      )}

      {sheet === "tags" && (
        <BottomSheet title="Tags" onClose={() => setSheet(null)}>
          <View className="px-5 pb-4">
            <TagPicker selectedTagIds={tagIds} onChange={setTagIds} />
          </View>
        </BottomSheet>
      )}

      {sheet === "repeat" && (
        <BottomSheet title="Repeat" onClose={() => setSheet(null)} maxHeightClassName="max-h-[85%]">
          <View className="gap-3 px-5 pb-4">
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
                <Text className="text-xs text-fg-subtle">
                  Only applied if you choose &ldquo;this and all future occurrences&rdquo; below.
                </Text>
              </View>
            )}

            {allowRecurring && !isRecurringEdit && (
              <View className="gap-3">
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
                            accessibilityRole="radio"
                            accessibilityState={{ selected: intervalUnit === unit }}
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
                    </View>
                  </>
                )}
              </View>
            )}
          </View>
        </BottomSheet>
      )}
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
  );
}
