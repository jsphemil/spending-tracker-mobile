import { eq } from "drizzle-orm";

import { db } from "../client";
import { tags } from "../schema";

// Tags are free-form and created inline at entry time (spec.md §5.3a) —
// look up by name first since the same tag gets reused across many
// transactions.
export function findOrCreateTag(name: string): number {
  const trimmed = name.trim();
  return db.transaction((tx) => {
    const existing = tx.select().from(tags).where(eq(tags.name, trimmed)).get();
    if (existing) return existing.id;

    const [row] = tx.insert(tags).values({ name: trimmed }).returning({ id: tags.id }).all();
    return row.id;
  });
}
