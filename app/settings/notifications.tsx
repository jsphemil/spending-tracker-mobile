import { useState } from "react";
import { Pressable, ScrollView, Switch, Text, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

import { db } from "../../db/client";
import { updateSettings } from "../../db/actions/settings";
import { useSettings } from "../../db/queries/settings";
import { parseReminderTime, rescheduleExpenseReminder } from "../../services/notifications";
import { useThemeColors } from "../../theme/palette";

function formatTime(hhmm: string): string {
  const { hour, minute } = parseReminderTime(hhmm);
  const d = new Date(2000, 0, 1, hour, minute);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

// Expense reminders (spec.md §5.19 / master prompt §15) — extensible by
// convention (settings.expenseReminder* prefix) so commitment/goal
// reminders can reuse this same screen shape later without a redesign.
export default function NotificationsSettingsScreen() {
  const { settings } = useSettings();
  const colors = useThemeColors();
  const [showTimePicker, setShowTimePicker] = useState(false);

  if (!settings) return null;

  const { hour, minute } = parseReminderTime(settings.expenseReminderTime);

  async function toggle(value: boolean) {
    if (!settings) return;
    updateSettings(settings.id, { expenseReminderEnabled: value });
    await rescheduleExpenseReminder(db, { ...settings, expenseReminderEnabled: value });
  }

  async function changeTime(date: Date) {
    if (!settings) return;
    const hhmm = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
    updateSettings(settings.id, { expenseReminderTime: hhmm });
    await rescheduleExpenseReminder(db, { ...settings, expenseReminderTime: hhmm });
  }

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ padding: 16, gap: 20 }}>
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-4">
          <Text className="text-base text-fg">Expense Reminders</Text>
          <Text className="text-sm text-fg-muted">
            A daily nudge if you haven't recorded an expense yet today. Transfers, income, and
            opening balances never count.
          </Text>
        </View>
        <Switch
          value={settings.expenseReminderEnabled}
          onValueChange={toggle}
          trackColor={{ false: colors.glassFill, true: colors.accent }}
          thumbColor="#ffffff"
          ios_backgroundColor={colors.glassFill}
        />
      </View>

      {settings.expenseReminderEnabled && (
        <View className="gap-2">
          <Text className="text-sm font-medium text-fg-muted">Reminder Time</Text>
          <Pressable
            onPress={() => setShowTimePicker(true)}
            className="rounded-lg border border-glass-border bg-glass px-3 py-2"
          >
            <Text className="text-base text-fg">{formatTime(settings.expenseReminderTime)}</Text>
          </Pressable>
          {showTimePicker && (
            <DateTimePicker
              value={new Date(2000, 0, 1, hour, minute)}
              mode="time"
              onChange={(_event, date) => {
                setShowTimePicker(false);
                if (date) changeTime(date);
              }}
            />
          )}
        </View>
      )}
    </ScrollView>
  );
}
