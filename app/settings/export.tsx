import { ScreenScrollView } from "../../components/ui/ScreenScrollView";
import { ExportTransactionsForm } from "../../components/ExportTransactionsForm";

export default function ExportSettingsScreen() {
  return (
    <ScreenScrollView contentContainerStyle={{ padding: 16 }}>
      <ExportTransactionsForm />
    </ScreenScrollView>
  );
}
