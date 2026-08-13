import { eq } from "drizzle-orm";

import { db } from "../client";
import { categories, type CategoryKind } from "../schema";

export interface CategoryInput {
  name: string;
  kind: CategoryKind;
  icon: string;
  color: string;
  monthlyBudgetMinor?: number | null;
}

export function createCategory(input: CategoryInput): number {
  const [row] = db.insert(categories).values(input).returning({ id: categories.id }).all();
  return row.id;
}

export function updateCategory(id: number, input: CategoryInput): void {
  db.update(categories).set(input).where(eq(categories.id, id)).run();
}

// Transactions referencing this category fall back to "Uncategorized" via
// the categoryId foreign key's onDelete: "set null" — no manual reassignment
// needed here.
export function deleteCategory(id: number): void {
  db.delete(categories).where(eq(categories.id, id)).run();
}
