import { and, count, eq, gte, lt } from "drizzle-orm";
import * as Notifications from "expo-notifications";

import type { Db } from "../db/client";
import { transactions } from "../db/schema";

// Extensible daily local-reminder scheduling (spec.md §5.19 "Expense
// reminders"). A single fixed identifier per reminder kind lets this always
// replace-not-stack its own pending notification — schedule/cancel calls
// are idempotent. Future reminder kinds (commitment/goal) get their own
// identifier + reschedule function alongside this one, not a redesign of it.
const EXPENSE_REMINDER_ID = "expense-reminder";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export function parseReminderTime(hhmm: string): { hour: number; minute: number } {
  const [hour, minute] = hhmm.split(":").map(Number);
  return { hour: Number.isFinite(hour) ? hour : 20, minute: Number.isFinite(minute) ? minute : 0 };
}

// "Recorded today" means a real `type: "expense"` transaction dated within
// today's local calendar day — transfers, income, opening-balance, and
// recurring-generated rows of any other type never count (master prompt
// §15). Uses the same date-column convention as services/balance.ts's
// getPeriodTotals rather than a separate notion of "today."
export function hasExpenseToday(db: Db, now: Date = new Date()): boolean {
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTomorrow = new Date(startOfDay.getFullYear(), startOfDay.getMonth(), startOfDay.getDate() + 1);

  const row = db
    .select({ n: count() })
    .from(transactions)
    .where(
      and(
        eq(transactions.type, "expense"),
        gte(transactions.date, startOfDay),
        lt(transactions.date, startOfTomorrow),
      ),
    )
    .get();

  return (row?.n ?? 0) > 0;
}

async function ensurePermission(): Promise<boolean> {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

// Next occurrence of hour:minute — today if that time hasn't passed yet
// (and no expense is logged yet), otherwise tomorrow.
function nextOccurrence(now: Date, hour: number, minute: number, skipToday: boolean): Date {
  const candidate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0, 0);
  if (skipToday || candidate <= now) {
    return new Date(candidate.getFullYear(), candidate.getMonth(), candidate.getDate() + 1, hour, minute, 0, 0);
  }
  return candidate;
}

// Re-derives whether a reminder should be pending and for when, then
// replaces whatever was previously scheduled under EXPENSE_REMINDER_ID.
// Call this whenever the picture that decides it changes: app foreground
// (app/_layout.tsx, same "check on open" pattern as the Dropbox auto-backup
// check), the reminder settings changing, or a new expense being recorded
// (db/actions/transactions.ts's createTransaction) — logging today's first
// expense should immediately push the pending notification to tomorrow
// rather than waiting for it to fire needlessly.
export async function rescheduleExpenseReminder(
  db: Db,
  settings: { expenseReminderEnabled: boolean; expenseReminderTime: string },
): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(EXPENSE_REMINDER_ID).catch(() => {});

  if (!settings.expenseReminderEnabled) return;

  const granted = await ensurePermission();
  if (!granted) return;

  const { hour, minute } = parseReminderTime(settings.expenseReminderTime);
  const now = new Date();
  const loggedToday = hasExpenseToday(db, now);
  const fireAt = nextOccurrence(now, hour, minute, loggedToday);

  await Notifications.scheduleNotificationAsync({
    identifier: EXPENSE_REMINDER_ID,
    content: {
      title: "Log today's spending?",
      body: "You haven't recorded an expense today — a few seconds now keeps your picture accurate.",
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireAt },
  });
}
