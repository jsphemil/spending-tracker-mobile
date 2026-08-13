import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { asc, eq } from "drizzle-orm";

import { db } from "../client";
import { goals } from "../schema";

export function useGoals() {
  return useLiveQuery(db.select().from(goals).orderBy(asc(goals.createdAt)));
}

export function useGoal(id: number) {
  const { data } = useLiveQuery(db.select().from(goals).where(eq(goals.id, id)), [id]);
  return data?.[0] ?? null;
}
