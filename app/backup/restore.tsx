import { useEffect, useState } from "react";
import { Alert, FlatList, Pressable, Text, View } from "react-native";

import { EmptyState } from "../../components/ui/EmptyState";
import { listBackups, restoreBackup, type BackupEntry } from "../../services/dropbox";

type ScreenState = "loading" | "loaded" | "error" | "restoring" | "done";

export default function RestoreBackupScreen() {
  const [state, setState] = useState<ScreenState>("loading");
  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listBackups()
      .then((entries) => {
        setBackups(entries);
        setState("loaded");
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : String(e));
        setState("error");
      });
  }, []);

  function confirmRestore(entry: BackupEntry) {
    Alert.alert(
      "Replace all data on this device?",
      `This restores "${entry.label}" and permanently replaces every account, transaction, category, and setting currently on this device. This can't be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Restore",
          style: "destructive",
          onPress: async () => {
            setState("restoring");
            try {
              await restoreBackup(entry.path);
              setState("done");
            } catch (e) {
              setError(e instanceof Error ? e.message : String(e));
              setState("error");
            }
          },
        },
      ],
    );
  }

  if (state === "restoring") {
    return (
      <View className="flex-1 items-center justify-center bg-bg p-6">
        <Text className="text-center text-fg">Restoring…</Text>
      </View>
    );
  }

  if (state === "done") {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-bg p-6">
        <Text className="text-center text-lg font-display text-fg">Restore complete</Text>
        <Text className="text-center text-fg-muted">
          Close this app completely and reopen it to see your restored data.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg">
      <FlatList
        data={backups}
        keyExtractor={(item) => item.path}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        ListHeaderComponent={
          <Text className="mb-2 text-sm text-fg-muted">
            Choose a backup to restore. This replaces everything currently on this device.
          </Text>
        }
        ListEmptyComponent={
          state === "loading" ? (
            <EmptyState message="Loading backups…" />
          ) : state === "error" ? (
            <EmptyState message={`Couldn't load backups: ${error}`} />
          ) : (
            <EmptyState message="No backups found yet." />
          )
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => confirmRestore(item)}
            className="flex-row items-center justify-between rounded-lg border border-glass-border bg-glass px-4 py-3"
          >
            <Text className="text-base text-fg">{item.label}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}
