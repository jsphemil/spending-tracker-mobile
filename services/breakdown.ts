// Generic "sum by key, keep a display name/icon" accumulator — used by the
// Account Detail page's Income/Expense-by-category and Transfers-by-
// counterpart-account breakdown sections.
//
// `icon` mixes two different value shapes depending on the caller: a literal
// emoji character (🏦 for transfers/opening balance, ❓ for uncategorized)
// versus a category's MaterialCommunityIcons name slug (e.g. "cash",
// "shopping") — the latter renders as icon glyphs via a component, not as
// text, so `iconType` tells the display layer which one it's holding.
export interface Bucket {
  key: string;
  name: string;
  icon: string;
  iconType: "emoji" | "mdi";
  totalMinor: number;
}

export function addToBucket(
  map: Map<string, Bucket>,
  key: string | number,
  name: string,
  icon: string,
  iconType: "emoji" | "mdi",
  amountMinor: number,
): void {
  const k = String(key);
  const existing = map.get(k);
  if (existing) {
    existing.totalMinor += amountMinor;
  } else {
    map.set(k, { key: k, name, icon, iconType, totalMinor: amountMinor });
  }
}

export function sortedBuckets(map: Map<string, Bucket>): Bucket[] {
  return Array.from(map.values()).sort((a, b) => b.totalMinor - a.totalMinor);
}
