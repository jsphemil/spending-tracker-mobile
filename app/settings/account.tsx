import { useState } from "react";
import { ScrollView, Switch, Text, View } from "react-native";

import { Input } from "../../components/ui/Input";
import { updateSettings } from "../../db/actions/settings";
import { useSettings } from "../../db/queries/settings";
import { useThemeColors } from "../../theme/palette";

export default function AccountDetailsScreen() {
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
        <Input
          value={nameValue}
          onChangeText={(text) => {
            setEditedName(true);
            setDisplayName(text);
          }}
          onBlur={() => updateSettings(settings.id, { displayName: nameValue.trim() || null })}
          placeholder="Your name"
          placeholderTextColor={colors.fgSubtle}
          className="rounded-lg border border-glass-border bg-glass px-3 py-2 text-base text-fg"
        />
        <Text className="text-xs text-fg-subtle">
          Optional — only used to personalize your Dashboard greeting, never sent anywhere.
        </Text>
      </View>

      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-4">
          <Text className="text-base text-fg">Budget Mode</Text>
          <Text className="text-sm text-fg-muted">
            Applies to every account unless overridden individually.
          </Text>
        </View>
        <Switch
          value={settings.budgetModeGlobal}
          onValueChange={(value) => updateSettings(settings.id, { budgetModeGlobal: value })}
          trackColor={{ false: colors.glassFill, true: colors.accent }}
          thumbColor="#ffffff"
          ios_backgroundColor={colors.glassFill}
        />
      </View>

      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-4">
          <Text className="text-base text-fg">Show Future Transactions</Text>
          <Text className="text-sm text-fg-muted">
            Applies to every account unless overridden individually.
          </Text>
        </View>
        <Switch
          value={settings.showFutureTxGlobal}
          onValueChange={(value) => updateSettings(settings.id, { showFutureTxGlobal: value })}
          trackColor={{ false: colors.glassFill, true: colors.accent }}
          thumbColor="#ffffff"
          ios_backgroundColor={colors.glassFill}
        />
      </View>
    </ScrollView>
  );
}
