import { and, asc, eq, gte, inArray, lt, or } from "drizzle-orm";

import type { Db } from "../db/client";
import { accounts, categories, tags, transactionTags, transactions } from "../db/schema";
import { toCsv } from "./csv";
import { minorToMajor } from "./format";
import { toLocalDateString } from "./period";

const CSV_HEADERS = [
  "Date",
  "Type",
  "Account",
  "Category",
  "Description",
  "Amount",
  "Currency",
  "Tags",
  "Recurring",
];

export interface ExportFilters {
  // Empty = every account, matching the real app's "leave all checkboxes
  // unchecked to export all accounts" convention.
  accountIds: number[];
  from: Date | null;
  to: Date | null; // inclusive, unlike this app's usual exclusive-end range convention
}

// Builds the same 9-column CSV as the real web app's transaction export
// (Date/Type/Account/Category/Description/Amount/Currency/Tags/Recurring),
// adapted for local-first mobile: no userId scoping (single-user on-device
// database), and a transfer's Currency column uses the source account's own
// currency instead of a hardcoded "INR" — the real app is INR-only, but
// this app already supports per-account currencies.
export function buildTransactionsCsv(db: Db, filters: ExportFilters): string {
  const conditions = [];
  if (filters.from) conditions.push(gte(transactions.date, filters.from));
  if (filters.to) {
    const exclusiveEnd = new Date(
      filters.to.getFullYear(),
      filters.to.getMonth(),
      filters.to.getDate() + 1,
    );
    conditions.push(lt(transactions.date, exclusiveEnd));
  }
  if (filters.accountIds.length > 0) {
    conditions.push(
      or(
        inArray(transactions.accountId, filters.accountIds),
        inArray(transactions.toAccountId, filters.accountIds),
      )!,
    );
  }

  const rows = db
    .select()
    .from(transactions)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(transactions.date))
    .all();

  const allAccounts = db.select().from(accounts).all();
  const allCategories = db.select().from(categories).all();
  const accountName = (id: number | null) => allAccounts.find((a) => a.id === id)?.name ?? "";
  const accountCurrency = (id: number | null) =>
    allAccounts.find((a) => a.id === id)?.currency ?? "INR";
  const categoryName = (id: number | null) => allCategories.find((c) => c.id === id)?.name;

  const tagRows = db
    .select({ transactionId: transactionTags.transactionId, name: tags.name })
    .from(transactionTags)
    .innerJoin(tags, eq(transactionTags.tagId, tags.id))
    .all();
  const tagNamesByTransaction = new Map<number, string[]>();
  for (const { transactionId, name } of tagRows) {
    const list = tagNamesByTransaction.get(transactionId) ?? [];
    list.push(name);
    tagNamesByTransaction.set(transactionId, list);
  }

  const csvRows = rows.map((t) => {
    const currency = accountCurrency(t.accountId);
    return [
      toLocalDateString(t.date),
      t.type,
      t.type === "transfer" ? `${accountName(t.accountId)} → ${accountName(t.toAccountId)}` : accountName(t.accountId),
      t.isOpeningBalance
        ? "Opening Balance"
        : (categoryName(t.categoryId) ?? (t.type === "transfer" ? "" : "Uncategorized")),
      t.description ?? "",
      minorToMajor(t.amountMinor, currency),
      currency,
      (tagNamesByTransaction.get(t.id) ?? []).join("; "),
      t.recurringRuleId ? "Yes" : "No",
    ];
  });

  return toCsv(CSV_HEADERS, csvRows);
}
