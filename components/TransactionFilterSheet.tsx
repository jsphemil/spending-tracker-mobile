import { useState, type ReactNode } from "react";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Icon } from "./ui/Icon";
import { useThemeColors } from "../theme/palette";

export type FilterMode = "month" | "custom" | "allTime";
export type TypeFilter = "all" | "income" | "expense" | "recurring" | "transfer";

export interface TransactionFilters {
  mode: FilterMode;
  customFrom: Date;
  customTo: Date;
  accountId?: number;
  categoryId?: number;
  type: TypeFilter;
}

export const MODE_LABELS: Record<FilterMode, string> = {
  month: "Month by month",
  custom: "Custom range",
  allTime: "All time",
};

export const TYPE_LABELS: Record<TypeFilter, string> = {
  all: "All types",
  income: "Income",
  expense: "Expense",
  recurring: "Recurring",
  transfer: "Transfers",
};

// The Transactions filters (spec.md §5.24), moved off the screen into one
// sheet: every V2 filter (date mode + custom range, account, category,
// recurring/transfers) plus Income and Expense type values. Changes apply
// live — the list behind updates as you pick — and "Show results" just
// closes the sheet.
export function TransactionFilterSheet({
  filters,
  onChange,
  onReset,
  onClose,
  accounts,
  categories,
  resultCount,
}: {
  filters: TransactionFilters;
  onChange: (next: Partial<TransactionFilters>) => void;
  onReset: () => void;
  onClose: () => void;
  accounts: { id: number; name: string }[];
  categories: { id: number; name: string }[];
  resultCount: number;
}) {
  const [picker, setPicker] = useState<"from" | "to" | null>(null);

  return (
    <Modal visible animationType="slide" onRequestClose={onClose} transparent>
      <Pressable className="flex-1 justify-end bg-black/50" onPress={onClose}>
        <Pressable className="max-h-[85%] rounded-t-3xl bg-surface" onPress={(e) => e.stopPropagation()}>
          <SafeAreaView edges={["bottom"]} className="flex-shrink">
            <View className="items-center pt-3">
              <View className="h-1 w-10 rounded-full bg-border-strong" />
            </View>
            <View className="flex-row items-center justify-between px-5 pb-2 pt-4">
              <Text className="font-display text-lg text-fg">Filter</Text>
              <Pressable onPress={onReset} accessibilityRole="button" hitSlop={12}>
                <Text className="text-sm font-medium text-accent">Reset</Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12 }}>
              <Group title="Date">
                {(Object.keys(MODE_LABELS) as FilterMode[]).map((mode) => (
                  <Chip key={mode} label={MODE_LABELS[mode]} selected={filters.mode === mode} onPress={() => onChange({ mode })} />
                ))}
              </Group>
              {filters.mode === "custom" && (
                <View className="mt-3 flex-row gap-2">
                  <DateField label="From" value={filters.customFrom} onPress={() => setPicker("from")} />
                  <DateField label="To" value={filters.customTo} onPress={() => setPicker("to")} />
                </View>
              )}
              {picker && (
                <DateTimePicker
                  value={picker === "from" ? filters.customFrom : filters.customTo}
                  mode="date"
                  onChange={(_, selected) => {
                    const which = picker;
                    setPicker(null);
                    if (selected) onChange(which === "from" ? { customFrom: selected } : { customTo: selected });
                  }}
                />
              )}

              <Group title="Type">
                {(Object.keys(TYPE_LABELS) as TypeFilter[]).map((type) => (
                  <Chip key={type} label={TYPE_LABELS[type]} selected={filters.type === type} onPress={() => onChange({ type })} />
                ))}
              </Group>

              <Group title="Account">
                <Chip label="All accounts" selected={filters.accountId === undefined} onPress={() => onChange({ accountId: undefined })} />
                {accounts.map((a) => (
                  <Chip key={a.id} label={a.name} selected={filters.accountId === a.id} onPress={() => onChange({ accountId: a.id })} />
                ))}
              </Group>

              <Group title="Category">
                <Chip label="All categories" selected={filters.categoryId === undefined} onPress={() => onChange({ categoryId: undefined })} />
                {categories.map((c) => (
                  <Chip key={c.id} label={c.name} selected={filters.categoryId === c.id} onPress={() => onChange({ categoryId: c.id })} />
                ))}
              </Group>
            </ScrollView>

            <View className="border-t border-border px-5 pb-4 pt-3">
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                className="min-h-12 items-center justify-center rounded-full bg-accent active:opacity-85"
              >
                <Text className="text-base font-semibold text-on-accent">
                  Show {resultCount} transaction{resultCount === 1 ? "" : "s"}
                </Text>
              </Pressable>
            </View>
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="mt-4">
      <Text accessibilityRole="header" className="mb-2 text-sm font-medium text-fg-muted">
        {title}
      </Text>
      <View className="flex-row flex-wrap gap-2">{children}</View>
    </View>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      className={`min-h-10 flex-row items-center gap-1.5 rounded-full border px-3.5 ${
        selected ? "border-accent bg-accent-soft" : "border-border"
      }`}
    >
      {selected && <Icon name="check" size={14} color={colors.accent} />}
      <Text className={`text-sm ${selected ? "font-medium text-accent" : "text-fg"}`}>{label}</Text>
    </Pressable>
  );
}

function DateField({ label, value, onPress }: { label: string; value: Date; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" className="flex-1 rounded-xl border border-border px-3 py-2">
      <Text className="text-xs text-fg-muted">{label}</Text>
      <Text className="text-sm text-fg">
        {value.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
      </Text>
    </Pressable>
  );
}
