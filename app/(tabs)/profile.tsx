import { useState } from "react";
import { Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";

import { updateSettings } from "../../db/actions/settings";
import { useSettings } from "../../db/queries/settings";

export default function ProfileScreen() {
  const { settings } = useSettings();
  const [displayName, setDisplayName] = useState("");
  const [editedName, setEditedName] = useState(false);

  if (!settings) return null;

  const nameValue = editedName ? displayName : (settings.displayName ?? "");

  return (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 16, gap: 24 }}>
      <View className="gap-2">
        <Text className="text-sm font-medium text-gray-700">Display Name (optional)</Text>
        <TextInput
          value={nameValue}
          onChangeText={(text) => {
            setEditedName(true);
            setDisplayName(text);
          }}
          onBlur={() => updateSettings(settings.id, { displayName: nameValue.trim() || null })}
          placeholder="Your name"
          className="rounded-lg border border-gray-200 px-3 py-2 text-base"
        />
      </View>

      <View className="flex-row items-center justify-between">
        <View className="pr-4">
          <Text className="text-base text-gray-900">Budget Mode</Text>
          <Text className="text-sm text-gray-500">
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
          <Text className="text-base text-gray-900">Show Future Transactions</Text>
          <Text className="text-sm text-gray-500">
            Applies to every account unless overridden individually.
          </Text>
        </View>
        <Switch
          value={settings.showFutureTxGlobal}
          onValueChange={(value) => updateSettings(settings.id, { showFutureTxGlobal: value })}
        />
      </View>

      <View className="gap-2">
        <Text className="text-sm font-medium text-gray-700">Base Currency</Text>
        <TextInput
          value={settings.baseCurrency}
          onChangeText={(text) =>
            updateSettings(settings.id, { baseCurrency: text.toUpperCase() })
          }
          autoCapitalize="characters"
          maxLength={3}
          className="rounded-lg border border-gray-200 px-3 py-2 text-base"
        />
      </View>

      <View className="gap-2 rounded-lg border border-gray-200 p-4">
        <Text className="text-base text-gray-900">Dropbox Backup</Text>
        <Text className="text-sm text-gray-500">
          Not connected. Automatic and manual backups are coming in a future update.
        </Text>
        <Pressable disabled className="items-center rounded-lg bg-gray-100 py-3">
          <Text className="text-gray-400">Connect Dropbox</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
