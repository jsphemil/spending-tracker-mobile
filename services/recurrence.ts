import { and, eq, gte } from "drizzle-orm";

import type { Db } from "../db/client";
import type { TransactionInput } from "../db/actions/transactions";
import {
  recurringRules,
  recurringRuleTags,
  transactionTags,
  transactions,
  type RecurrenceUnit,
} from "../db/schema";
import { refreshAccountsWidget } from "../widgets/refresh";

type RecurringRule = typeof recurringRules.$inferSelect;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

// Real Transaction rows are materialized up to a rolling horizon rather than
// generated infinitely ahead (indefinite rules have no end date) or computed
// virtually at read time (occurrences need a stable id to be individually
// edited/deleted).
const HORIZON_MONTHS = 3;

// Local-calendar arithmetic (device timezone), matching services/period.ts's
// convention — this is a single-device local-first app, not a server with a
// separate client timezone to reconcile, so there's no UTC-normalization
// need the way the source web app has.
function addInterval(date: Date, count: number, unit: RecurrenceUnit): Date {
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();
  switch (unit) {
    case "day":
      return new Date(y, m, d + count);
    case "week":
      return new Date(y, m, d + count * 7);
    case "month":
      return new Date(y, m + count, d);
    case "year":
      return new Date(y + count, m, d);
  }
}

function subDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1);
}

function horizonDate(): Date {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return new Date(today.getFullYear(), today.getMonth() + HORIZON_MONTHS, today.getDate());
}

// The rolling today+3-month horizon is only a baseline — a screen browsing
// further out (e.g. the Dashboard/Account month nav pushed past it) must be
// able to pull materialization out further too, or an indefinite recurring
// rule would just stop appearing past that point despite having no end
// date. `through` extends the horizon to cover whichever date the caller
// actually needs, never shrinks it.
function effectiveHorizon(through?: Date): Date {
  const base = horizonDate();
  return through && through > base ? through : base;
}

function buildOccurrenceData(rule: RecurringRule, occurrenceDate: Date) {
  return {
    type: rule.type,
    amountMinor: rule.amountMinor,
    date: occurrenceDate,
    accountId: rule.accountId,
    toAccountId: rule.toAccountId,
    categoryId: rule.categoryId,
    description: rule.description,
    recurringRuleId: rule.id,
    occurrenceDate,
    isRecurringGenerated: true,
  };
}

// Idempotent and safe to call repeatedly: the (recurringRuleId,
// occurrenceDate) unique index + onConflictDoNothing means re-materializing
// an already-covered date is a no-op rather than a duplicate row. No
// separate "exception" table is needed to remember skipped/edited
// occurrences (unlike the source web app) — materializedThrough only ever
// moves forward, so an occurrence once passed is never revisited by this
// loop again, whether its row was later edited, deleted, or left alone.
// Returns whether it actually inserted any transaction rows, so the caller
// can tell a real materialization apart from the far more common no-op
// call — this runs on nearly every screen mount.
function materializeRule(tx: Tx, rule: RecurringRule, horizon: Date): boolean {
  const effectiveEnd = rule.endDate && rule.endDate < horizon ? rule.endDate : horizon;
  if (effectiveEnd < rule.startDate) return false;

  let cursor = rule.materializedThrough
    ? addInterval(rule.materializedThrough, rule.intervalCount, rule.intervalUnit)
    : rule.startDate;
  if (cursor > effectiveEnd) return false;

  const occurrences: Date[] = [];
  while (cursor <= effectiveEnd) {
    occurrences.push(cursor);
    cursor = addInterval(cursor, rule.intervalCount, rule.intervalUnit);
  }

  const ruleTags = tx
    .select({ tagId: recurringRuleTags.tagId })
    .from(recurringRuleTags)
    .where(eq(recurringRuleTags.recurringRuleId, rule.id))
    .all();

  let insertedAny = false;
  for (const occurrenceDate of occurrences) {
    const inserted = tx
      .insert(transactions)
      .values(buildOccurrenceData(rule, occurrenceDate))
      .onConflictDoNothing()
      .returning({ id: transactions.id })
      .all();
    const newId = inserted[0]?.id;
    if (newId !== undefined) {
      insertedAny = true;
      for (const { tagId } of ruleTags) {
        tx.insert(transactionTags).values({ transactionId: newId, tagId }).onConflictDoNothing().run();
      }
    }
  }

  // The next call's cursor is derived from this value via addInterval(), so
  // it must be the last real occurrence date, not the horizon itself —
  // otherwise the interval math would jump from the horizon forward and
  // silently skip whatever occurrence should have landed between the last
  // materialized date and the horizon. (occurrences is never empty here:
  // the cursor > effectiveEnd guard above already returned early for that
  // case, so the while loop always pushes at least once.)
  tx.update(recurringRules)
    .set({ materializedThrough: occurrences[occurrences.length - 1] })
    .where(eq(recurringRules.id, rule.id))
    .run();

  return insertedAny;
}

// Primary materialization entry point — call at the top of any screen that
// reads transaction data, passing `through` when that screen is viewing a
// specific date range (e.g. the month currently being browsed) so an
// indefinite rule keeps materializing as far as the user actually
// navigates, not just today+3 months.
export function ensureMaterialized(db: Db, opts?: { through?: Date }): void {
  const horizon = effectiveHorizon(opts?.through);
  let insertedAny = false;
  db.transaction((tx) => {
    const rules = tx
      .select()
      .from(recurringRules)
      .where(eq(recurringRules.isActive, true))
      .all()
      .filter((rule) => rule.startDate <= horizon);
    for (const rule of rules) {
      if (materializeRule(tx, rule, horizon)) insertedAny = true;
    }
  });

  // Materializing a rule creates real transactions, so account balances just
  // moved — the same reason every write in db/actions refreshes the widget.
  // Without this the widget kept showing pre-salary/pre-rent balances until
  // its next 30-minute scheduled update. Guarded on an actual insert because
  // this function runs on nearly every screen mount and is otherwise a
  // no-op; firing the native bridge each time would be pure noise.
  if (insertedAny) refreshAccountsWidget();
}

export interface RecurringSchedule {
  intervalCount: number;
  intervalUnit: RecurrenceUnit;
  endDate: Date | null;
}

export function createRecurringSeries(
  db: Db,
  input: TransactionInput,
  schedule: RecurringSchedule,
): number {
  return db.transaction((tx) => {
    const [rule] = tx
      .insert(recurringRules)
      .values({
        type: input.type,
        amountMinor: input.amountMinor,
        accountId: input.accountId,
        toAccountId: input.type === "transfer" ? input.toAccountId ?? null : null,
        categoryId: input.type === "transfer" ? null : input.categoryId ?? null,
        description: input.description ?? null,
        intervalCount: schedule.intervalCount,
        intervalUnit: schedule.intervalUnit,
        startDate: input.date,
        endDate: schedule.endDate,
      })
      .returning({ id: recurringRules.id })
      .all();

    for (const tagId of input.tagIds) {
      tx.insert(recurringRuleTags).values({ recurringRuleId: rule.id, tagId }).run();
    }

    const createdRule = tx.select().from(recurringRules).where(eq(recurringRules.id, rule.id)).get()!;
    materializeRule(tx, createdRule, horizonDate());

    return rule.id;
  });
}

interface RecurringTransactionRef {
  id: number;
  recurringRuleId: number;
  occurrenceDate: Date;
}

// "Just this one" edit: `date` can diverge from `occurrenceDate` (the
// schedule's anchor for this slot never changes) — e.g. a salary that's
// normally on the 1st but landed on the 3rd this month. occurrenceDate
// stays put so materializeRule's idempotency key still lines up.
export function editSingleOccurrence(db: Db, existing: RecurringTransactionRef, input: TransactionInput): void {
  db.transaction((tx) => {
    tx.update(transactions)
      .set({
        type: input.type,
        amountMinor: input.amountMinor,
        date: input.date,
        accountId: input.accountId,
        toAccountId: input.type === "transfer" ? input.toAccountId ?? null : null,
        categoryId: input.type === "transfer" ? null : input.categoryId ?? null,
        description: input.description ?? null,
        isRecurringException: true,
      })
      .where(eq(transactions.id, existing.id))
      .run();

    tx.delete(transactionTags).where(eq(transactionTags.transactionId, existing.id)).run();
    for (const tagId of input.tagIds) {
      tx.insert(transactionTags).values({ transactionId: existing.id, tagId }).run();
    }
  });
}

// "This and all future" edit: closes the old rule the day before this
// occurrence, deletes this and any later materialized rows under it
// (including any of their own individual "just this one" overrides — an
// explicit "change this and everything after" supersedes those), and opens
// a new rule anchored on the edited date carrying over the old interval —
// so moving the date here reschedules this and every future occurrence.
// All inside one db.transaction (unlike the source web app's sequential
// calls, which work around a pooled-Postgres-connection limitation that
// doesn't apply to this app's local SQLite — a real transaction is strictly
// safer here).
export function editFutureOccurrences(
  db: Db,
  existing: RecurringTransactionRef,
  input: TransactionInput,
  newEndDate: Date | null,
): number {
  return db.transaction((tx) => {
    const oldRule = tx
      .select()
      .from(recurringRules)
      .where(eq(recurringRules.id, existing.recurringRuleId))
      .get();
    if (!oldRule) throw new Error("Recurring rule not found");

    const splitDate = existing.occurrenceDate;
    const dayBefore = subDay(splitDate);

    const [newRule] = tx
      .insert(recurringRules)
      .values({
        type: input.type,
        amountMinor: input.amountMinor,
        accountId: input.accountId,
        toAccountId: input.type === "transfer" ? input.toAccountId ?? null : null,
        categoryId: input.type === "transfer" ? null : input.categoryId ?? null,
        description: input.description ?? null,
        intervalCount: oldRule.intervalCount,
        intervalUnit: oldRule.intervalUnit,
        startDate: input.date,
        endDate: newEndDate,
        isActive: true,
        supersedesRuleId: oldRule.id,
      })
      .returning({ id: recurringRules.id })
      .all();

    for (const tagId of input.tagIds) {
      tx.insert(recurringRuleTags).values({ recurringRuleId: newRule.id, tagId }).run();
    }

    tx.update(recurringRules)
      .set({ endDate: dayBefore, isActive: false })
      .where(eq(recurringRules.id, oldRule.id))
      .run();

    tx.delete(transactions)
      .where(
        and(
          eq(transactions.recurringRuleId, oldRule.id),
          gte(transactions.occurrenceDate, splitDate),
        ),
      )
      .run();

    const createdRule = tx.select().from(recurringRules).where(eq(recurringRules.id, newRule.id)).get()!;
    materializeRule(tx, createdRule, horizonDate());

    return newRule.id;
  });
}

export function deleteSingleOccurrence(db: Db, transactionId: number): void {
  db.delete(transactions).where(eq(transactions.id, transactionId)).run();
}

export function deleteFutureOccurrences(db: Db, existing: RecurringTransactionRef): void {
  db.transaction((tx) => {
    const dayBefore = subDay(existing.occurrenceDate);
    tx.update(recurringRules)
      .set({ endDate: dayBefore, isActive: false })
      .where(eq(recurringRules.id, existing.recurringRuleId))
      .run();

    tx.delete(transactions)
      .where(
        and(
          eq(transactions.recurringRuleId, existing.recurringRuleId),
          gte(transactions.occurrenceDate, existing.occurrenceDate),
        ),
      )
      .run();
  });
}

const UNIT_LABELS: Record<RecurrenceUnit, string> = {
  day: "day",
  week: "week",
  month: "month",
  year: "year",
};

export function describeSchedule(intervalCount: number, intervalUnit: RecurrenceUnit): string {
  const unit = UNIT_LABELS[intervalUnit];
  return intervalCount === 1 ? `Repeats every ${unit}` : `Repeats every ${intervalCount} ${unit}s`;
}

// Normalizes any cadence to a monthly figure so a weekly ₹500 charge and a
// yearly ₹6,000 one can be summed into one meaningful "commitments per
// month" total. Average month/week length (365.25/12 days), not a fixed 30
// — keeps a weekly rule's monthly-equivalent stable regardless of which
// month you'd otherwise divide by.
const AVG_DAYS_PER_MONTH = 365.25 / 12;
const AVG_WEEKS_PER_MONTH = AVG_DAYS_PER_MONTH / 7;

export function monthlyEquivalent(
  amountMinor: number,
  intervalCount: number,
  intervalUnit: RecurrenceUnit,
): number {
  switch (intervalUnit) {
    case "day":
      return (amountMinor * AVG_DAYS_PER_MONTH) / intervalCount;
    case "week":
      return (amountMinor * AVG_WEEKS_PER_MONTH) / intervalCount;
    case "month":
      return amountMinor / intervalCount;
    case "year":
      return amountMinor / (12 * intervalCount);
  }
}
