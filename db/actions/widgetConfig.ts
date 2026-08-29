import { eq } from "drizzle-orm";

import { db } from "../client";
import { widgetAccountSelections } from "../schema";

export function saveWidgetAccountSelection(widgetId: number, accountIds: number[]): void {
  db.insert(widgetAccountSelections)
    .values({ widgetId, accountIdsJson: JSON.stringify(accountIds) })
    .onConflictDoUpdate({
      target: widgetAccountSelections.widgetId,
      set: { accountIdsJson: JSON.stringify(accountIds) },
    })
    .run();
}

export function getWidgetAccountSelection(widgetId: number): number[] {
  const row = db
    .select()
    .from(widgetAccountSelections)
    .where(eq(widgetAccountSelections.widgetId, widgetId))
    .get();
  if (!row) return [];
  try {
    const parsed = JSON.parse(row.accountIdsJson);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "number") : [];
  } catch {
    return [];
  }
}

export function deleteWidgetAccountSelection(widgetId: number): void {
  db.delete(widgetAccountSelections).where(eq(widgetAccountSelections.widgetId, widgetId)).run();
}
