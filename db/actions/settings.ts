import { eq } from "drizzle-orm";

import { db } from "../client";
import { settings } from "../schema";

export function updateSettings(
  id: number,
  patch: Partial<{
    budgetModeGlobal: boolean;
    showFutureTxGlobal: boolean;
    displayName: string | null;
    baseCurrency: string;
  }>,
): void {
  db.update(settings).set(patch).where(eq(settings.id, id)).run();
}
