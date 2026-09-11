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
    // v3 (spec.md §5.22 / §5.23). The two JSON columns take the already
    // serialised string — callers go through the constants' serialisers.
    appLockEnabled: boolean;
    lastSeenVersion: string | null;
    dashboardLayout: string | null;
    hintsSeen: string | null;
  }>,
): void {
  db.update(settings).set(patch).where(eq(settings.id, id)).run();
}
