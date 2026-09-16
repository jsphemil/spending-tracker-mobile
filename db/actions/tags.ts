import { eq } from "drizzle-orm";

import { db } from "../client";
import { tags } from "../schema";
import { COLOR_PALETTE } from "../../constants/colorPalette";

// Tags are free-form and created inline at entry time (spec.md §5.3a) —
// look up by name first since the same tag gets reused across many
// transactions. A new tag is spread across the palette by id, the same
// rule migration 0018 applied to the tags that predate colours, so it
// never arrives grey-by-accident; icon and colour are then the user's to
// change on the Edit Tag screen.
export function findOrCreateTag(name: string): number {
  const trimmed = name.trim();
  return db.transaction((tx) => {
    const existing = tx.select().from(tags).where(eq(tags.name, trimmed)).get();
    if (existing) return existing.id;

    const [row] = tx.insert(tags).values({ name: trimmed }).returning({ id: tags.id }).all();
    tx.update(tags)
      .set({ color: COLOR_PALETTE[row.id % COLOR_PALETTE.length] })
      .where(eq(tags.id, row.id))
      .run();
    return row.id;
  });
}

export interface TagInput {
  name: string;
  icon: string;
  color: string;
}

// Returns an error message rather than throwing on a name clash — the
// form shows it inline, same as the account and fund forms do.
export function updateTag(id: number, input: TagInput): string | null {
  const name = input.name.trim();
  if (!name) return "Give the tag a name";
  const clash = db.select({ id: tags.id }).from(tags).where(eq(tags.name, name)).get();
  if (clash && clash.id !== id) return `A tag called "${name}" already exists`;
  db.update(tags).set({ name, icon: input.icon, color: input.color }).where(eq(tags.id, id)).run();
  return null;
}

// transaction_tags and recurring_rule_tags cascade; the transactions
// themselves are untouched — they only lose the label.
export function deleteTag(id: number): void {
  db.delete(tags).where(eq(tags.id, id)).run();
}
