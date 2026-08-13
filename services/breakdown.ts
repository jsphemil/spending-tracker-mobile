// Generic "sum by key, keep a display name/icon" accumulator — used by the
// Account Detail page's Income/Expense-by-category and Transfers-by-
// counterpart-account breakdown sections.
export interface Bucket {
  key: string;
  name: string;
  icon: string;
  totalMinor: number;
}

export function addToBucket(
  map: Map<string, Bucket>,
  key: string | number,
  name: string,
  icon: string,
  amountMinor: number,
): void {
  const k = String(key);
  const existing = map.get(k);
  if (existing) {
    existing.totalMinor += amountMinor;
  } else {
    map.set(k, { key: k, name, icon, totalMinor: amountMinor });
  }
}

export function sortedBuckets(map: Map<string, Bucket>): Bucket[] {
  return Array.from(map.values()).sort((a, b) => b.totalMinor - a.totalMinor);
}
