import { eq } from "drizzle-orm";

import { db } from "../client";
import { widgetAccountSelections } from "../schema";

export interface WidgetAccountConfig {
  accountIds: number[];
  opacityPct: number;
}

export function saveWidgetAccountSelection(widgetId: number, accountIds: number[], opacityPct: number): void {
  db.insert(widgetAccountSelections)
    .values({ widgetId, accountIdsJson: JSON.stringify(accountIds), opacityPct })
    .onConflictDoUpdate({
      target: widgetAccountSelections.widgetId,
      set: { accountIdsJson: JSON.stringify(accountIds), opacityPct },
    })
    .run();
}

export function getWidgetAccountConfig(widgetId: number): WidgetAccountConfig {
  const row = db
    .select()
    .from(widgetAccountSelections)
    .where(eq(widgetAccountSelections.widgetId, widgetId))
    .get();
  if (!row) return { accountIds: [], opacityPct: 85 };

  let accountIds: number[] = [];
  try {
    const parsed = JSON.parse(row.accountIdsJson);
    accountIds = Array.isArray(parsed) ? parsed.filter((v) => typeof v === "number") : [];
  } catch {
    accountIds = [];
  }
  return { accountIds, opacityPct: row.opacityPct };
}

export function deleteWidgetAccountSelection(widgetId: number): void {
  db.delete(widgetAccountSelections).where(eq(widgetAccountSelections.widgetId, widgetId)).run();
}
