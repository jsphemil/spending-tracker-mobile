import { useState } from "react";
import { Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";

import { CurrencyPicker } from "../../components/CurrencyPicker";
import { ExportTransactionsForm } from "../../components/ExportTransactionsForm";
import { updateSettings } from "../../db/actions/settings";
import { useSettings } from "../../db/queries/settings";
import { THEME_PREFERENCES, type ThemePreference } from "../../db/schema";
import { useThemeColors } from "../../theme/palette";

const THEME_LABELS: Record<ThemePreference, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
};

export default function ProfileScreen() {
  const { settings } = useSettings();
  const colors = useThemeColors();
  const [displayName, setDisplayName] = useState("");
  const [editedName, setEditedName] = useState(false);

  if (!settings) return null;

  const nameValue = editedName ? displayName : (settings.displayName ?? "");

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ padding: 16, gap: 24 }}>
      <View className="gap-2">
        <Text className="text-sm font-medium text-fg-muted">Display Name (optional)</Text>
        <TextInput
          value={nameValue}
          onChangeText={(text) => {
            setEditedName(true);
            setDisplayName(text);
          }}
          onBlur={() => updateSettings(settings.id, { displayName: nameValue.trim() || null })}
          placeholder="Your name"
          placeholderTextColor={colors.fgSubtle}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-base text-fg"
        />
      </View>

      <View className="gap-2">
        <Text className="text-sm font-medium text-fg-muted">Theme</Text>
        <View className="flex-row gap-2">
          {THEME_PREFERENCES.map((pref) => (
            <Pressable
              key={pref}
              onPress={() => updateSettings(settings.id, { themePreference: pref })}
              className={`flex-1 items-center rounded-lg border py-2 ${
                settings.themePreference === pref
                  ? "border-accent bg-accent-soft"
                  : "border-border bg-surface"
              }`}
            >
              <Text
                className={settings.themePreference === pref ? "text-accent" : "text-fg-muted"}
              >
                {THEME_LABELS[pref]}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View className="flex-row items-center justify-between">
        <View className="pr-4">
          <Text className="text-base text-fg">Budget Mode</Text>
          <Text className="text-sm text-fg-muted">
            Applies to every account unless overridden individually.
          </Text>
        </View>
        <Switch
          value={settings.budgetModeGlobal}
          onValueChange={(value) => updateSettings(settings.id, { budgetModeGlobal: value })}
        />
      </View>

      <View className="flex-row items-center justify-between">
        <View className="pr-4">
          <Text className="text-base text-fg">Show Future Transactions</Text>
          <Text className="text-sm text-fg-muted">
            Applies to every account unless overridden individually.
          </Text>
        </View>
        <Switch
          value={settings.showFutureTxGlobal}
          onValueChange={(value) => updateSettings(settings.id, { showFutureTxGlobal: value })}
        />
      </View>

      <View className="gap-2">
        <CurrencyPicker
          label="Base Currency"
          value={settings.baseCurrency}
          onChange={(code) => updateSettings(settings.id, { baseCurrency: code })}
        />
        <Text className="text-xs text-fg-subtle">
          Every cross-currency figure in the app (net worth, budgets, foreign-currency
          accounts) recalculates against this currency immediately.
        </Text>
      </View>

      <ExportTransactionsForm />

      <View className="gap-2 rounded-lg border border-border bg-surface p-4">
        <Text className="text-base text-fg">Dropbox Backup</Text>
        <Text className="text-sm text-fg-muted">
          Not connected. Automatic and manual backups are coming in a future update.
        </Text>
        <Pressable disabled className="items-center rounded-lg bg-surface-2 py-3">
          <Text className="text-fg-subtle">Connect Dropbox</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
