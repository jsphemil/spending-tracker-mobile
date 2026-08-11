import type { CategoryKind } from "../db/schema";

export const DEFAULT_CATEGORIES: {
  name: string;
  kind: CategoryKind;
  icon: string;
  color: string;
}[] = [
  { name: "Shopping", kind: "expense", icon: "shopping", color: "#F97316" },
  { name: "Eating Out", kind: "expense", icon: "silverware-fork-knife", color: "#EF4444" },
  { name: "Groceries", kind: "expense", icon: "cart", color: "#84CC16" },
  { name: "Travel", kind: "expense", icon: "airplane", color: "#0EA5E9" },
  { name: "Rent", kind: "expense", icon: "home", color: "#8B5CF6" },
  { name: "Bills & Utilities", kind: "expense", icon: "receipt", color: "#EAB308" },
  { name: "Entertainment", kind: "expense", icon: "movie", color: "#EC4899" },
  { name: "Health", kind: "expense", icon: "heart-pulse", color: "#14B8A6" },
  { name: "Transport", kind: "expense", icon: "car", color: "#6366F1" },
  { name: "Other", kind: "expense", icon: "dots-horizontal", color: "#6B7280" },
  { name: "Salary", kind: "income", icon: "cash", color: "#22C55E" },
  { name: "Freelance", kind: "income", icon: "briefcase", color: "#0EA5E9" },
  { name: "Investments", kind: "income", icon: "trending-up", color: "#8B5CF6" },
  { name: "Gifts", kind: "income", icon: "gift", color: "#EC4899" },
  { name: "Other Income", kind: "income", icon: "dots-horizontal", color: "#6B7280" },
];
