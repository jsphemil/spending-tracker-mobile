import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

export const ACCOUNT_TYPES = [
  "savings",
  "investment",
  "deposit",
  "wallet",
  "credit_card",
] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const TRANSACTION_TYPES = ["income", "expense", "transfer"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const CATEGORY_KINDS = ["income", "expense"] as const;
export type CategoryKind = (typeof CATEGORY_KINDS)[number];

export const RECURRENCE_UNITS = ["day", "week", "month", "year"] as const;
export type RecurrenceUnit = (typeof RECURRENCE_UNITS)[number];

export const THEME_PREFERENCES = ["light", "dark", "system"] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];

// All monetary amounts are stored as integers in the currency's smallest
// unit (e.g. paise for INR, cents for USD) to avoid floating-point rounding
// errors in balance/summary math.

export const accounts = sqliteTable("accounts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  type: text("type", { enum: ACCOUNT_TYPES }).notNull(),
  color: text("color").notNull(),
  icon: text("icon").notNull(),
  currency: text("currency").notNull().default("INR"),
  creditLimitMinor: integer("credit_limit_minor"),
  // null = inherit the global setting, 0/1 = explicit per-account override.
  budgetModeEnabled: integer("budget_mode_enabled", { mode: "boolean" }),
  showFutureTxEnabled: integer("show_future_tx_enabled", { mode: "boolean" }),
  budgetMonthlyMinor: integer("budget_monthly_minor"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  kind: text("kind", { enum: CATEGORY_KINDS }).notNull(),
  icon: text("icon").notNull(),
  color: text("color").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const tags = sqliteTable("tags", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
});

export const recurringRules = sqliteTable("recurring_rules", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type", { enum: TRANSACTION_TYPES }).notNull(),
  amountMinor: integer("amount_minor").notNull(),
  accountId: integer("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "restrict" }),
  toAccountId: integer("to_account_id").references(() => accounts.id, {
    onDelete: "restrict",
  }),
  categoryId: integer("category_id").references(() => categories.id, {
    onDelete: "set null",
  }),
  description: text("description"),
  intervalCount: integer("interval_count").notNull(),
  intervalUnit: text("interval_unit", { enum: RECURRENCE_UNITS }).notNull(),
  startDate: integer("start_date", { mode: "timestamp" }).notNull(),
  endDate: integer("end_date", { mode: "timestamp" }),
  // Last date up to which occurrences have been materialized into `transactions`.
  materializedThrough: integer("materialized_through", { mode: "timestamp" }),
});

export const recurringRuleTags = sqliteTable(
  "recurring_rule_tags",
  {
    recurringRuleId: integer("recurring_rule_id")
      .notNull()
      .references(() => recurringRules.id, { onDelete: "cascade" }),
    tagId: integer("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.recurringRuleId, table.tagId] }),
  ],
);

export const transactions = sqliteTable(
  "transactions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    type: text("type", { enum: TRANSACTION_TYPES }).notNull(),
    amountMinor: integer("amount_minor").notNull(),
    date: integer("date", { mode: "timestamp" }).notNull(),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    toAccountId: integer("to_account_id").references(() => accounts.id, {
      onDelete: "restrict",
    }),
    categoryId: integer("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    description: text("description"),
    isOpeningBalance: integer("is_opening_balance", { mode: "boolean" })
      .notNull()
      .default(false),
    recurringRuleId: integer("recurring_rule_id").references(
      () => recurringRules.id,
      { onDelete: "set null" },
    ),
  },
  (table) => [
    index("transactions_account_id_idx").on(table.accountId),
    index("transactions_date_idx").on(table.date),
    index("transactions_category_id_idx").on(table.categoryId),
  ],
);

export const transactionTags = sqliteTable(
  "transaction_tags",
  {
    transactionId: integer("transaction_id")
      .notNull()
      .references(() => transactions.id, { onDelete: "cascade" }),
    tagId: integer("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.transactionId, table.tagId] })],
);

// Single-row table (id is always 1) holding global app preferences.
export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  budgetModeGlobal: integer("budget_mode_global", { mode: "boolean" })
    .notNull()
    .default(false),
  showFutureTxGlobal: integer("show_future_tx_global", { mode: "boolean" })
    .notNull()
    .default(true),
  displayName: text("display_name"),
  baseCurrency: text("base_currency").notNull().default("INR"),
  themePreference: text("theme_preference", { enum: THEME_PREFERENCES })
    .notNull()
    .default("system"),
  widgetAccountId: integer("widget_account_id").references(
    () => accounts.id,
    { onDelete: "set null" },
  ),
});

export const exchangeRateCache = sqliteTable(
  "exchange_rate_cache",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    baseCurrency: text("base_currency").notNull(),
    targetCurrency: text("target_currency").notNull(),
    rate: real("rate").notNull(),
    fetchedAt: integer("fetched_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("exchange_rate_pair_idx").on(
      table.baseCurrency,
      table.targetCurrency,
    ),
  ],
);
