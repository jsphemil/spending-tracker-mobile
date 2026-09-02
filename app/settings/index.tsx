import { ScrollView, Text, View } from "react-native";

import { DropboxBackupCard } from "../../components/DropboxBackupCard";
import { SettingsRow, SettingsSection } from "../../components/ui/SettingsRow";
import { useSettings } from "../../db/queries/settings";

// Settings V2 (spec.md §5.19): grouped structure replacing the old flat
// Profile tab. Profile is reached from here, not the bottom tab bar.
export default function SettingsScreen() {
  const { settings } = useSettings();
  if (!settings) return null;

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ padding: 16, gap: 20 }}>
      <SettingsSection title="Profile">
        <SettingsRow
          icon="account-circle-outline"
          label="Account Details"
          sublabel={settings.displayName ?? "Name, budget mode, future transactions"}
          href="/settings/account"
          last
        />
      </SettingsSection>

      <SettingsSection title="Preferences">
        <SettingsRow
          icon="calculator"
          label="Default Currency"
          sublabel={settings.baseCurrency}
          href="/settings/currency"
        />
        <SettingsRow icon="information-outline" label="Notifications" href="/settings/notifications" />
        <SettingsRow icon="settings-outline" label="Appearance" href="/settings/appearance" last />
      </SettingsSection>

      <SettingsSection title="Security & Legal">
        <SettingsRow icon="shield" label="Privacy & Security" href="/settings/privacy" />
        <SettingsRow icon="book-open" label="Help & Support" href="/settings/support" />
        <SettingsRow icon="information-outline" label="About Erebor" href="/settings/about" last />
      </SettingsSection>

      <View className="gap-2">
        <Text className="px-1 text-xs font-semibold uppercase tracking-wide text-fg-subtle">
          Backup & Restore
        </Text>
        <DropboxBackupCard
          settingsId={settings.id}
          dropboxAccountEmail={settings.dropboxAccountEmail}
          lastAutoBackupDate={settings.lastAutoBackupDate}
        />
      </View>

      <SettingsSection title="Your Data">
        <SettingsRow icon="receipt" label="Export Transactions (CSV)" href="/settings/export" last />
      </SettingsSection>
    </ScrollView>
  );
}
