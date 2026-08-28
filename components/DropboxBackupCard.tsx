import { useState } from "react";
import { Alert, Text, View } from "react-native";
import { Link } from "expo-router";

import { backupNow, connectDropbox, disconnectDropbox } from "../services/dropbox";
import { parseLocalDateString } from "../services/period";
import { Button } from "./ui/Button";

interface DropboxBackupCardProps {
  settingsId: number;
  dropboxAccountEmail: string | null;
  lastAutoBackupDate: string | null;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// Profile's Dropbox card — was a static disabled placeholder ("coming in
// a future update") until spec.md §3 shipped 2026-08-28. Backups go
// directly from this device to a folder in the user's own Dropbox
// (App-folder-scoped access, see services/dropbox.ts) — never through a
// server this app's developer controls.
export function DropboxBackupCard({ settingsId, dropboxAccountEmail, lastAutoBackupDate }: DropboxBackupCardProps) {
  const [connecting, setConnecting] = useState(false);
  const [backingUp, setBackingUp] = useState(false);

  async function handleConnect() {
    setConnecting(true);
    try {
      await connectDropbox(settingsId);
    } catch (error) {
      Alert.alert("Couldn't connect Dropbox", errorMessage(error));
    } finally {
      setConnecting(false);
    }
  }

  async function handleBackupNow() {
    setBackingUp(true);
    try {
      await backupNow(settingsId, "manual");
      Alert.alert("Backup complete", "Your data was backed up to Dropbox.");
    } catch (error) {
      Alert.alert("Backup failed", errorMessage(error));
    } finally {
      setBackingUp(false);
    }
  }

  function handleDisconnect() {
    Alert.alert(
      "Disconnect Dropbox?",
      "This only stops backups — it doesn't delete anything already backed up in your Dropbox, or any data on this device.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Disconnect", style: "destructive", onPress: () => disconnectDropbox(settingsId) },
      ],
    );
  }

  if (!dropboxAccountEmail) {
    return (
      <View className="gap-2 rounded-lg border border-glass-border bg-glass p-4">
        <Text className="text-base font-display text-fg">Dropbox Backup</Text>
        <Text className="text-sm text-fg-muted">
          Not connected. Back up your data to your own Dropbox — automatically once a day, and
          manually anytime — so you can restore it on a new device.
        </Text>
        <Button variant="primary" onPress={handleConnect} disabled={connecting}>
          {connecting ? "Connecting…" : "Connect Dropbox"}
        </Button>
      </View>
    );
  }

  const lastBackupLabel = lastAutoBackupDate
    ? parseLocalDateString(lastAutoBackupDate).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Not yet";

  return (
    <View className="gap-3 rounded-lg border border-glass-border bg-glass p-4">
      <View className="gap-1">
        <Text className="text-base font-display text-fg">Dropbox Backup</Text>
        <Text className="text-sm text-fg-muted">Connected as {dropboxAccountEmail}</Text>
        <Text className="text-xs text-fg-subtle">Last automatic backup: {lastBackupLabel}</Text>
      </View>
      <Button variant="primary" onPress={handleBackupNow} disabled={backingUp}>
        {backingUp ? "Backing up…" : "Back up now"}
      </Button>
      <Link href="/backup/restore" asChild>
        <Button variant="ghost">Restore from backup</Button>
      </Link>
      <Button variant="danger" onPress={handleDisconnect}>
        Disconnect
      </Button>
    </View>
  );
}
