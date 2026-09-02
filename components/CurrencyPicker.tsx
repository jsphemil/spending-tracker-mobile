import { useEffect, useMemo, useState } from "react";
import { FlatList, Modal, Pressable, Text, View } from "react-native";
import { Input } from "./ui/Input";

import { getSupportedCurrencies, type CurrencyInfo } from "../services/currency";
import { useThemeColors } from "../theme/palette";

interface CurrencyPickerProps {
  value: string;
  onChange: (code: string) => void;
  label?: string;
  // Renders as a small icon-only trigger (currency code, no label/box) for
  // the V2 global header's currency selector — same underlying search
  // modal, no separate currency-picking implementation (spec.md §5.19).
  compact?: boolean;
}

// Full searchable list of every currency Frankfurter supports (~170+),
// replacing a small hardcoded pill list — requested 2026-08-13 after the
// Profile page's base-currency field only offered a handful of quick
// picks. Used for base-currency selection (onboarding + Profile/Settings +
// the V2 global header); account currency keeps its existing pill+free-text
// field for now.
export function CurrencyPicker({ value, onChange, label = "Currency", compact = false }: CurrencyPickerProps) {
  const colors = useThemeColors();
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState("");
  const [currencies, setCurrencies] = useState<CurrencyInfo[]>([]);

  useEffect(() => {
    if (visible && currencies.length === 0) {
      getSupportedCurrencies().then(setCurrencies);
    }
  }, [visible, currencies.length]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return currencies;
    return currencies.filter(
      (c) => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q),
    );
  }, [currencies, query]);

  const selected = currencies.find((c) => c.code === value.toUpperCase());

  return (
    <View className={compact ? undefined : "gap-2"}>
      {!compact && <Text className="text-sm font-medium text-fg-muted">{label}</Text>}
      {compact ? (
        <Pressable
          onPress={() => setVisible(true)}
          accessibilityRole="button"
          accessibilityLabel={`Currency: ${value.toUpperCase()}`}
          className="h-9 min-w-9 items-center justify-center rounded-full bg-glass px-2"
        >
          <Text className="text-xs font-semibold text-fg">{value.toUpperCase()}</Text>
        </Pressable>
      ) : (
        <Pressable
          onPress={() => setVisible(true)}
          className="rounded-lg border border-glass-border bg-glass px-3 py-2"
        >
          <Text className="text-base text-fg">
            {value.toUpperCase()}
            {selected ? ` — ${selected.name}` : ""}
          </Text>
        </Pressable>
      )}

      <Modal visible={visible} animationType="slide" onRequestClose={() => setVisible(false)}>
        <View className="flex-1 bg-bg pt-16">
          <View className="flex-row items-center justify-between px-4 pb-3">
            <Text className="text-lg font-display text-fg">Select Currency</Text>
            <Pressable onPress={() => setVisible(false)}>
              <Text className="text-accent">Done</Text>
            </Pressable>
          </View>
          <Input
            value={query}
            onChangeText={setQuery}
            placeholder="Search by code or name"
            placeholderTextColor={colors.fgSubtle}
            autoCapitalize="none"
            className="mx-4 mb-3 rounded-lg border border-glass-border bg-glass px-3 py-2 text-base text-fg"
          />
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.code}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
            ListEmptyComponent={
              <Text className="mt-8 text-center text-fg-subtle">
                {currencies.length === 0 ? "Loading currencies…" : "No matches."}
              </Text>
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  onChange(item.code);
                  setVisible(false);
                  setQuery("");
                }}
                className={`flex-row items-center justify-between border-b border-glass-border py-3 ${
                  item.code === value.toUpperCase() ? "bg-accent-soft" : ""
                }`}
              >
                <Text className="text-base text-fg">
                  {item.symbol} {item.code} — {item.name}
                </Text>
                {item.code === value.toUpperCase() && <Text className="text-accent">✓</Text>}
              </Pressable>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}
