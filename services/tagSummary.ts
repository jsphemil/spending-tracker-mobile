// Folds the Tags overview's per-tag-per-currency rows (db/queries/tags.ts
// useTagSummaries) into one base-currency line per tag (spec.md §5.3a).
// Pure — the screen supplies the converter — so it unit-tests under node.

export interface TagSummaryInput {
  id: number;
  name: string;
  icon: string;
  color: string;
  currency: string | null;
  txCount: number;
  incomeMinor: number;
  expenseMinor: number;
}

export interface TagSummary {
  id: number;
  name: string;
  icon: string;
  color: string;
  txCount: number;
  /** income − expense in base currency; transfers never counted. */
  netMinor: number;
}

export function summarizeTags(
  rows: TagSummaryInput[],
  toBaseMinor: (amountMinor: number, currency: string) => number,
): TagSummary[] {
  const byId = new Map<number, TagSummary>();
  for (const row of rows) {
    let entry = byId.get(row.id);
    if (!entry) {
      entry = { id: row.id, name: row.name, icon: row.icon, color: row.color, txCount: 0, netMinor: 0 };
      byId.set(row.id, entry);
    }
    // A tag with no transactions comes through as one row with a null
    // currency and zero counts — nothing to add.
    if (row.currency == null) continue;
    entry.txCount += row.txCount;
    entry.netMinor += toBaseMinor(row.incomeMinor, row.currency) - toBaseMinor(row.expenseMinor, row.currency);
  }
  return Array.from(byId.values());
}
