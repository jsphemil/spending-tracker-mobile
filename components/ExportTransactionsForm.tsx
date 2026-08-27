import { useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Directory, File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

import { db } from "../db/client";
import { useAccounts } from "../db/queries/accounts";
import { buildTransactionsCsv } from "../services/export";
import { toLocalDateString } from "../services/period";
import { useThemeColors } from "../theme/palette";
import { Button } from "./ui/Button";

function defaultFrom(): Date {
  return new Date(new Date().getFullYear(), 0, 1);
}

export function ExportTransactionsForm() {
  const { data: accounts } = useAccounts();
  const [selectedAccountIds, setSelectedAccountIds] = useState<Set<number>>(new Set());
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(() => new Date());
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [exporting, setExporting] = useState(false);
  const colors = useThemeColors();

  function toggleAccount(id: number) {
    setSelectedAccountIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleExport() {
    setExporting(true);
    try {
      const csv = buildTransactionsCsv(db, {
        accountIds: Array.from(selectedAccountIds),
        from,
        to,
      });

      const filename = `transactions_${toLocalDateString(from)}_to_${toLocalDateString(to)}.csv`;
      const file = new File(new Directory(Paths.cache), filename);
      if (file.exists) file.delete();
      file.create();
      file.write(csv);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: "text/csv",
          dialogTitle: "Export Transactions",
          UTI: "public.comma-separated-values-text",
        });
      } else {
        Alert.alert("Sharing not available", `Saved to ${file.uri}`);
      }
    } catch (error) {
      Alert.alert("Export failed", error instanceof Error ? error.message : String(error));
    } finally {
      setExporting(false);
    }
  }

  return (
    <View className="gap-3 rounded-lg border border-glass-border bg-glass p-4">
      <Text className="text-base text-fg">Export Transactions</Text>

      <View className="gap-2">
        <Text className="text-sm font-medium text-fg-muted">Accounts</Text>
        <Text className="text-xs text-fg-subtle">Leave all unchecked to export every account.</Text>
        {(accounts ?? []).length === 0 && (
          <Text className="text-sm text-fg-subtle">No accounts yet.</Text>
        )}
        <View className="flex-row flex-wrap gap-2">
          {(accounts ?? []).map((a) => {
            const selected = selectedAccountIds.has(a.id);
            return (
              <Pressable
                key={a.id}
                onPress={() => toggleAccount(a.id)}
                className={`rounded-full border px-3 py-1.5 ${
                  selected ? "border-accent bg-accent-soft" : "border-glass-border"
                }`}
              >
                <Text className={selected ? "text-accent" : "text-fg-muted"}>{a.name}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View className="flex-row items-center gap-2">
        <Pressable
          onPress={() => setShowFromPicker(true)}
          className="flex-1 rounded-lg border border-glass-border bg-surface-2 px-3 py-2"
        >
          <Text className="text-xs text-fg-muted">From</Text>
          <Text className="text-sm text-fg">{from.toDateString()}</Text>
        </Pressable>
        <Pressable
          onPress={() => setShowToPicker(true)}
          className="flex-1 rounded-lg border border-glass-border bg-surface-2 px-3 py-2"
        >
          <Text className="text-xs text-fg-muted">To</Text>
          <Text className="text-sm text-fg">{to.toDateString()}</Text>
        </Pressable>
        {showFromPicker && (
          <DateTimePicker
            value={from}
            mode="date"
            onChange={(_, selected) => {
              setShowFromPicker(false);
              if (selected) setFrom(selected);
            }}
          />
        )}
        {showToPicker && (
          <DateTimePicker
            value={to}
            mode="date"
            onChange={(_, selected) => {
              setShowToPicker(false);
              if (selected) setTo(selected);
            }}
          />
        )}
      </View>

      <Button onPress={handleExport} disabled={exporting}>
        {exporting ? "Preparing…" : "Export as CSV"}
      </Button>
      <Text className="text-xs text-fg-subtle">
        Opens directly in Excel, Sheets, or Numbers — no separate .xlsx format needed.
      </Text>
    </View>
  );
}
