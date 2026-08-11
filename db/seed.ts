import { DEFAULT_CATEGORIES } from "../constants/defaultCategories";
import type { Db } from "./client";
import { categories, settings } from "./schema";

export function ensureSeeded(db: Db) {
  const existing = db.select().from(settings).limit(1).all();
  if (existing.length > 0) return;

  db.transaction((tx) => {
    tx.insert(settings).values({}).run();
    for (const category of DEFAULT_CATEGORIES) {
      tx.insert(categories).values(category).run();
    }
  });
}
