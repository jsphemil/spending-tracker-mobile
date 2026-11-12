import { and, asc, eq, gte, inArray, lt, or } from "drizzle-orm";

import type { Db } from "../db/client";
import { accounts, categories, funds, tags, transactionTags, transactions } from "../db/schema";
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
  "Fund",
];

export interface ExportFilters {
  // Empty = every account, matching the real app's "leave all checkboxes
  // unchecked to export all accounts" convention.
  accountIds: number[];
  from: Date | null;
  to: Date | null; // inclusive, unlike this app's usual exclusive-end range convention
}

// Builds the real web app's 9-column transaction export
// (Date/Type/Account/Category/Description/Amount/Currency/Tags/Recurring)
// plus a 10th Fund column, adapted for local-first mobile: no userId
// scoping (single-user on-device database), and a transfer's Currency
// column uses the source account's own currency instead of a hardcoded
// "INR" — the real app is INR-only, but this app already supports
// per-account currencies.
//
// Fund is blank for anything not spent from one. This is the only export
// path that enumerates columns by hand — the Dropbox backup is a whole-file
// VACUUM INTO snapshot, so it picked up the new tables with no change.
export interface ExportRow {
  date: Date;
  type: "income" | "expense" | "transfer";
  account: string;
  category: string;
  description: string;
  /** Signed minor units in the row's own currency; a refund is negative. */
  amountMinor: number;
  currency: string;
  tags: string[];
  recurring: boolean;
  fund: string;
  isOpeningBalance: boolean;
}

// The filtered, enriched rows behind both exports (CSV and the PDF
// statement), oldest first.
export function loadExportRows(db: Db, filters: ExportFilters): ExportRow[] {
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
  const allFunds = db.select().from(funds).all();
  const accountName = (id: number | null) => allAccounts.find((a) => a.id === id)?.name ?? "";
  const accountCurrency = (id: number | null) =>
    allAccounts.find((a) => a.id === id)?.currency ?? "INR";
  const categoryName = (id: number | null) => allCategories.find((c) => c.id === id)?.name;
  const fundName = (id: number | null) => allFunds.find((f) => f.id === id)?.name ?? "";

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

  return rows.map((t) => ({
    date: t.date,
    type: t.type,
    account: t.type === "transfer" ? `${accountName(t.accountId)} → ${accountName(t.toAccountId)}` : accountName(t.accountId),
    category: t.isOpeningBalance
      ? "Opening Balance"
      : (categoryName(t.categoryId) ?? (t.type === "transfer" ? "" : "Uncategorized")),
    description: t.description ?? "",
    amountMinor: t.amountMinor,
    currency: accountCurrency(t.accountId),
    tags: tagNamesByTransaction.get(t.id) ?? [],
    recurring: t.recurringRuleId != null,
    fund: fundName(t.fundId),
    isOpeningBalance: t.isOpeningBalance,
  }));
}

export function buildTransactionsCsv(db: Db, filters: ExportFilters): string {
  const csvRows = loadExportRows(db, filters).map((r) => [
    toLocalDateString(r.date),
    r.type,
    r.account,
    r.category,
    r.description,
    minorToMajor(r.amountMinor, r.currency),
    r.currency,
    r.tags.join("; "),
    r.recurring ? "Yes" : "No",
    r.fund,
  ]);
  return toCsv(CSV_HEADERS, csvRows);
}
