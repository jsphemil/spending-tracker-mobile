import { ScrollView, Text, View } from "react-native";

// Deliberately no hardcoded support contact address here — that's a
// product/publishing decision for the app owner to set explicitly, not one
// to invent while redesigning navigation.
export default function HelpSupportScreen() {
  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ padding: 16, gap: 16 }}>
      <View className="gap-2">
        <Text className="text-base font-semibold text-fg">Common questions</Text>
        <Text className="text-sm text-fg-muted">
          Moving money between your own accounts? Record it as a Transfer, not an Expense —
          Erebor keeps both accounts in sync and won't count it as spending.
        </Text>
        <Text className="text-sm text-fg-muted">
          Want your figures summarized in a different currency? Change your Default Currency in
          Settings — your accounts and original transaction amounts stay exactly as they are.
        </Text>
        <Text className="text-sm text-fg-muted">
          Switching devices? Connect the same Dropbox account under Backup & Restore and pick a
          backup to restore.
        </Text>
      </View>
    </ScrollView>
  );
}
