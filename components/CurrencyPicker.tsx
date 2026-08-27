import { useEffect, useMemo, useState } from "react";
import { FlatList, Modal, Pressable, Text, TextInput, View } from "react-native";

import { getSupportedCurrencies, type CurrencyInfo } from "../services/currency";
import { useThemeColors } from "../theme/palette";

interface CurrencyPickerProps {
  value: string;
  onChange: (code: string) => void;
  label?: string;
}

// Full searchable list of every currency Frankfurter supports (~170+),
// replacing a small hardcoded pill list — requested 2026-08-13 after the
// Profile page's base-currency field only offered a handful of quick
// picks. Used for base-currency selection (onboarding + Profile); account
// currency keeps its existing pill+free-text field for now.
export function CurrencyPicker({ value, onChange, label = "Currency" }: CurrencyPickerProps) {
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
    <View className="gap-2">
      <Text className="text-sm font-medium text-fg-muted">{label}</Text>
      <Pressable
        onPress={() => setVisible(true)}
        className="rounded-lg border border-glass-border bg-glass px-3 py-2"
      >
        <Text className="text-base text-fg">
          {value.toUpperCase()}
          {selected ? ` — ${selected.name}` : ""}
        </Text>
      </Pressable>

      <Modal visible={visible} animationType="slide" onRequestClose={() => setVisible(false)}>
        <View className="flex-1 bg-bg pt-16">
          <View className="flex-row items-center justify-between px-4 pb-3">
            <Text className="text-lg font-semibold text-fg">Select Currency</Text>
            <Pressable onPress={() => setVisible(false)}>
              <Text className="text-accent">Done</Text>
            </Pressable>
          </View>
          <TextInput
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
