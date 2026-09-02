import { ScrollView } from "react-native";

import { ExportTransactionsForm } from "../../components/ExportTransactionsForm";

export default function ExportSettingsScreen() {
  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ padding: 16 }}>
      <ExportTransactionsForm />
    </ScrollView>
  );
}
