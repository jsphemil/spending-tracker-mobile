import { Linking, Pressable, ScrollView, Text, View } from "react-native";

const PRIVACY_POLICY_URL = "https://meliordevelopments.github.io/erebor-wealth-management-pp/";

// Static summary of spec.md §3's "local-first, developer never hosts your
// data" architecture, plus the link out to the full policy — not a second
// copy of the legal text, just the plain-language version of it.
export default function PrivacySecurityScreen() {
  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ padding: 16, gap: 16 }}>
      <View className="gap-2">
        <Text className="text-base font-semibold text-fg">Your data stays on your device</Text>
        <Text className="text-sm text-fg-muted">
          Erebor is local-first: every account, transaction, category, goal and commitment you
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
