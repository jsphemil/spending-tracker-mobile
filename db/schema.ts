import { sql } from "drizzle-orm";
import {
  type AnySQLiteColumn,
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  unique,
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

export const FUND_STATUSES = ["active", "closed"] as const;
export type FundStatus = (typeof FUND_STATUSES)[number];

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
  // Only meaningful for expense categories, mirroring accounts.budgetMonthlyMinor's
  // "only meaningful for one type" pattern — always this-month, no month-nav
  // (matches the real app's categories/page.tsx design note).
  monthlyBudgetMinor: integer("monthly_budget_minor"),
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
  // false once an "edit/delete this and all future occurrences" split has
  // closed this rule off — ensureMaterialized skips inactive rules, so a
  // closed rule can never regenerate the occurrences that were deleted out
  // from under it.
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  // Set on the *new* rule created by an "this and all future" edit,
  // pointing back at the rule it replaced — lineage only, not read by the
  // materialization engine itself.
  supersedesRuleId: integer("supersedes_rule_id").references(
    (): AnySQLiteColumn => recurringRules.id,
    { onDelete: "set null" },
  ),
  // The fund every occurrence of this rule spends from (spec.md §5.21).
  // Expenses only, forced null otherwise in services/recurrence.ts.
  //
  // Lives on the rule rather than only on each materialized row so a
  // pre-funded commitment — an EMI, say — keeps drawing down the fund as
  // future instalments materialize, instead of needing each one linked by
  // hand. Occurrences inherit it at materialization, and because fund
  // consumption respects the month cutoff, instalments dated ahead don't
  // eat the fund early: it falls month by month as they actually land.
  fundId: integer("fund_id").references((): AnySQLiteColumn => funds.id, {
    onDelete: "set null",
  }),
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

// Funds (spec.md §5.21) — money you still own but have earmarked for a
// future purpose. A logical allocation layer *above* the accounting model:
// a fund holds no money of its own, is deliberately not tied to any
// account (the physical location of money and its intended purpose are
// separate concepts), and earmarking never moves a balance or changes net
// worth. Amounts are in the app's base currency, same as
// `goals.targetAmountMinor` and `categories.monthlyBudgetMinor`.
//
// There is deliberately no `funded` column and no "fully funded" flag —
// both are derived in services/funds.ts. See fundAllocations below for why.
export const funds = sqliteTable("funds", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  targetAmountMinor: integer("target_amount_minor").notNull(),
  // Optional and purely informational — it drives a "due soon and still
  // short" nudge, never a pace projection. Fund contributions are
  // intentionally irregular, so a trailing average would be meaningless.
  targetDate: integer("target_date", { mode: "timestamp" }),
  icon: text("icon").notNull(),
  color: text("color").notNull(),
  // Closing a fund writes a balancing release row rather than relying on
  // this, so `status` never participates in the balance math — it is purely
  // a UI grouping (Active / Closed).
  status: text("status", { enum: FUND_STATUSES }).notNull().default("active"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  closedAt: integer("closed_at", { mode: "timestamp" }),
});

// The ledger of manual "add to fund" / "release from fund" events. A fund's
// balance is DERIVED from this plus its linked expenses, never stored:
//
//   funded = SUM(allocations) − min(SUM(allocations), SUM(linked expenses))
//
// Storing a running `funds.funded` instead would need write hooks on every
// transaction create/update/delete path — including the bulk
// `deleteFutureOccurrences` — and any future path that forgot one would
// silently corrupt it. Deriving means editing a fund-linked expense from
// 40000 to 35000 returns 5000 to the fund, and deleting it returns the
// whole 40000, with no reconciliation code at all. Same derive-don't-store
// rule as services/balance.ts; don't "optimize" this into a column.
//
// `amountMinor` is SIGNED (positive = added, negative = released),
// deliberately unlike `transactions.amountMinor`, which is always absolute
// with the sign carried by `type`. There are only two directions here and
// the sum is the whole point, so a CASE expression would add a forgettable
// branch for no benefit.
//
// `date` exists so Earmarked can be computed as of a cutoff, the same
// exclusive-upper-bound convention as getAccountBalanceMinor — without it,
// the Dashboard's month-nav would show a range.end net worth minus a
// today-anchored Earmarked, arithmetic that lies.
export const fundAllocations = sqliteTable(
  "fund_allocations",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    fundId: integer("fund_id")
      .notNull()
      .references(() => funds.id, { onDelete: "cascade" }),
    amountMinor: integer("amount_minor").notNull(),
    date: integer("date", { mode: "timestamp" }).notNull(),
    note: text("note"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    index("fund_allocations_fund_id_idx").on(table.fundId),
    index("fund_allocations_date_idx").on(table.date),
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
    // The schedule "slot" this row fills — stays fixed even if `date` is
    // edited via "just this one" (e.g. a salary normally on the 1st landing
    // on the 3rd one month keeps occurrenceDate on the 1st). Null for
    // non-recurring rows. Paired with recurringRuleId as the uniqueness key
    // that keeps materialization idempotent.
    occurrenceDate: integer("occurrence_date", { mode: "timestamp" }),
    isRecurringGenerated: integer("is_recurring_generated", { mode: "boolean" })
      .notNull()
      .default(false),
    isRecurringException: integer("is_recurring_exception", { mode: "boolean" })
      .notNull()
      .default(false),
    // Spending this expense against a fund (spec.md §5.21). Only ever set on
    // `type = 'expense'` rows — forced null otherwise in db/actions, and the
    // consumption sum in services/funds.ts filters on type as a backstop, so
    // a stray link can't corrupt the math. "set null" (matching categoryId)
    // means deleting a fund never destroys the expense itself.
    fundId: integer("fund_id").references(() => funds.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    index("transactions_account_id_idx").on(table.accountId),
    index("transactions_date_idx").on(table.date),
    index("transactions_category_id_idx").on(table.categoryId),
    index("transactions_fund_id_idx").on(table.fundId),
    unique("transactions_recurring_occurrence_idx").on(
      table.recurringRuleId,
      table.occurrenceDate,
    ),
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

// `goals` lived here until 2026-09-10 (spec.md §5.17, dropped in migration
// 0015). It held net-worth targets scored against the whole portfolio, so
// every goal shared one number and none could hold money independently.
// §5.21's Funds replaces it with a primitive that actually allocates.

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
  // Gates the first-run onboarding flow (spec.md §5.13). Migration 0005
  // backfills this to true for any row that already has accounts, so
  // existing installs with real data never get sent through onboarding.
  onboardingCompleted: integer("onboarding_completed", { mode: "boolean" })
    .notNull()
    .default(false),
  widgetAccountId: integer("widget_account_id").references(
    () => accounts.id,
    { onDelete: "set null" },
  ),
  // Dropbox backup (spec.md §3). Doubles as the "connected" signal —
  // non-null means connected — so there's no separate boolean column.
  // The actual OAuth access/refresh tokens are never stored here (this
  // table isn't encrypted); they live in expo-secure-store, see
  // services/dropbox.ts.
  dropboxAccountEmail: text("dropbox_account_email"),
  // "YYYY-MM-DD" of the last automatic backup — the check-on-app-open
  // gate that stands in for a true OS background schedule (unreliable
  // on mobile). Manual backups don't touch this field.
  lastAutoBackupDate: text("last_auto_backup_date"),
  // Expense reminder (spec.md §5.19 "Expense reminders") — an
  // extensible-by-convention prefix (`expenseReminder*`) so future reminder
  // kinds (commitment/goal) can each get their own enabled+time pair
  // without redesigning this table.
  expenseReminderEnabled: integer("expense_reminder_enabled", { mode: "boolean" })
    .notNull()
    .default(false),
  // "HH:MM", 24-hour, device-local time.
  expenseReminderTime: text("expense_reminder_time").notNull().default("20:00"),
  // Dashboard privacy toggle (spec.md §5.8) — masks the Net worth card's
  // figures behind an eye/eye-off icon since Dashboard is the first
  // screen shown on app open. Defaults to hidden (not visible) for the
  // same reason — first thing shown, so first-run privacy should be the
  // safe default rather than opt-in. Persisted so it survives restarts.
  // `net_worth_hidden` lived here until 2026-09-10. The Dashboard's privacy
  // toggle is now session-scoped — always hidden on app open, a reveal
  // lasting only until the app closes — so there is nothing to persist.
  // See hooks/useNetWorthHidden.ts.
});

// Home Screen Widget (spec.md §5.11) — which accounts the "Accounts &
// Quick Add" widget shows, one row per widget instance (a device can
// have multiple copies of the same widget, each configured separately).
// Read directly by the widget's headless JS task handler, not through
// the normal React Query/hook layer.
export const widgetAccountSelections = sqliteTable("widget_account_selections", {
  widgetId: integer("widget_id").primaryKey(),
  accountIdsJson: text("account_ids_json").notNull(),
  // Card background opacity, 0-100 — user-adjustable in the widget's
  // configuration screen so it can blend with any wallpaper.
  opacityPct: integer("opacity_pct").notNull().default(85),
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
