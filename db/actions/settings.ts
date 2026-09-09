import { eq } from "drizzle-orm";

import { db } from "../client";
import { settings, type ThemePreference } from "../schema";

export function updateSettings(
  id: number,
  patch: Partial<{
    budgetModeGlobal: boolean;
    showFutureTxGlobal: boolean;
    displayName: string | null;
    baseCurrency: string;
    themePreference: ThemePreference;
    onboardingCompleted: boolean;
    dropboxAccountEmail: string | null;
    lastAutoBackupDate: string | null;
    expenseReminderEnabled: boolean;
    expenseReminderTime: string;
  }>,
): void {
  db.update(settings).set(patch).where(eq(settings.id, id)).run();
}
