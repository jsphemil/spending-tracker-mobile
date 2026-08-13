import { eq } from "drizzle-orm";

import { db } from "../client";
import { goals } from "../schema";

export interface GoalInput {
  name: string;
  targetAmountMinor: number;
  targetDate: Date | null;
}

export function createGoal(input: GoalInput): number {
  const [row] = db.insert(goals).values(input).returning({ id: goals.id }).all();
  return row.id;
}

export function updateGoal(id: number, input: GoalInput): void {
  db.update(goals).set(input).where(eq(goals.id, id)).run();
}

export function deleteGoal(id: number): void {
  db.delete(goals).where(eq(goals.id, id)).run();
}
