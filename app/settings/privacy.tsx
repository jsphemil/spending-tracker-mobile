import { useEffect, useState } from "react";
import { Linking, Pressable, ScrollView, Switch, Text, View } from "react-native";

import { updateSettings } from "../../db/actions/settings";
import { useSettings } from "../../db/queries/settings";
import { authenticate, canUseBiometrics } from "../../services/appLock";
import { useThemeColors } from "../../theme/palette";

const PRIVACY_POLICY_URL = "https://meliordevelopments.github.io/erebor-wealth-management-pp/";

// Static summary of spec.md §3's "local-first, developer never hosts your
// data" architecture, plus the link out to the full policy — not a second
// copy of the legal text, just the plain-language version of it. The app
// lock toggle (spec.md §5.23) lives here because it is a privacy control,
// not a login.
export default function PrivacySecurityScreen() {
  const { settings } = useSettings();
  const colors = useThemeColors();
  // null = still asking the OS; the toggle is disabled until it answers.
  const [biometricsAvailable, setBiometricsAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    canUseBiometrics()
      .then((ok) => {
        if (!cancelled) setBiometricsAvailable(ok);
      })
      .catch(() => {
        if (!cancelled) setBiometricsAvailable(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!settings) return null;

  async function toggleLock(value: boolean) {
    if (!settings) return;
    // Turning it on runs one prompt first and only persists on success, so
    // the lock can never be enabled into a lock-out. Turning it off needs
    // no prompt: the user is already inside the app.
    if (value) {
      const ok = await authenticate().catch(() => false);
      if (!ok) return;
    }
    updateSettings(settings.id, { appLockEnabled: value });
  }

  const lockSublabel =
    biometricsAvailable === false
      ? "Set up fingerprint or face unlock in your phone's settings first."
      : "Ask for your fingerprint, face, or your phone's PIN or pattern when Erebor opens or comes back after 30 seconds in the background.";

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ padding: 16, gap: 16 }}>
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-4">
          <Text className="text-base text-fg">Unlock with biometrics</Text>
          <Text className="text-sm text-fg-muted">{lockSublabel}</Text>
        </View>
        <Switch
          value={settings.appLockEnabled}
          onValueChange={toggleLock}
          disabled={biometricsAvailable !== true}
          trackColor={{ false: colors.glassFill, true: colors.accent }}
          thumbColor="#ffffff"
          ios_backgroundColor={colors.glassFill}
        />
      </View>
      <View className="gap-2">
        <Text className="text-base font-semibold text-fg">Your data stays on your device</Text>
        <Text className="text-sm text-fg-muted">
          Erebor is local-first: every account, transaction, category, fund and commitment you
          record lives in a database on this device. Nothing is sent to a server this app's
          developer hosts or can see.
        </Text>
      </View>
      <View className="gap-2">
        <Text className="text-base font-semibold text-fg">Backups go to your own Dropbox</Text>
        <Text className="text-sm text-fg-muted">
          If you connect Dropbox, backups are written directly from this device to a
          sandboxed, app-only folder in your own Dropbox account — never through a third-party
          server. Disconnecting Dropbox stops future backups; it doesn't delete anything already
          there or on this device.
        </Text>
      </View>
      <View className="gap-2">
        <Text className="text-base font-semibold text-fg">Exchange rates</Text>
        <Text className="text-sm text-fg-muted">
          Currency conversion figures are fetched from a public exchange-rate API and cached on
          this device — no financial data is included in those requests.
        </Text>
      </View>
      <Pressable onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}>
        <Text className="text-sm font-medium text-accent">Read the full Privacy Policy</Text>
      </Pressable>
    </ScrollView>
  );
}
