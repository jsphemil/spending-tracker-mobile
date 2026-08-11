import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { asc, eq } from "drizzle-orm";

import { db } from "../client";
import { categories, type CategoryKind } from "../schema";

export function useCategories(kind?: CategoryKind) {
  const query = kind
    ? db.select().from(categories).where(eq(categories.kind, kind))
    : db.select().from(categories);

  return useLiveQuery(query.orderBy(asc(categories.sortOrder), asc(categories.id)));
}
