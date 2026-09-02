import { ScrollView, Text, View } from "react-native";

import { CurrencyPicker } from "../../components/CurrencyPicker";
import { updateSettings } from "../../db/actions/settings";
import { useSettings } from "../../db/queries/settings";

export default function CurrencySettingsScreen() {
  const { settings } = useSettings();
  if (!settings) return null;

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ padding: 16, gap: 16 }}>
      <View className="gap-2">
        <CurrencyPicker
          label="Base Currency"
          value={settings.baseCurrency}
          onChange={(code) => updateSettings(settings.id, { baseCurrency: code })}
        />
        <Text className="text-xs text-fg-subtle">
          This is the currency Erebor uses when summarizing your finances — net worth, budgets,
          and any foreign-currency accounts convert against this one. Your accounts can still use
          different currencies, and your original transaction amounts are never changed.
        </Text>
      </View>
    </ScrollView>
  );
}
