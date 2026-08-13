import { and, eq, gte, lt } from "drizzle-orm";

import { recurringRules, tags, transactionTags, transactions } from "../db/schema";
import { toLocalDateString } from "../services/period";
import {
  createRecurringSeries,
  deleteFutureOccurrences,
  deleteSingleOccurrence,
  describeSchedule,
  editFutureOccurrences,
  editSingleOccurrence,
  ensureMaterialized,
  monthlyEquivalent,
} from "../services/recurrence";
import { closeTestDb, createTestDb, insertAccount, type TestDb } from "./testDb";

let db: TestDb;

// Fixes "now" so horizonDate()/addInterval() are deterministic across the
// whole suite instead of depending on the day the tests happen to run.
const TODAY = new Date(2026, 7, 12); // 2026-08-12

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(TODAY);
  db = createTestDb();
});

afterEach(() => {
  closeTestDb(db);
  jest.useRealTimers();
});

function baseInput(overrides: Partial<Parameters<typeof createRecurringSeries>[1]> = {}) {
  return {
    type: "expense" as const,
    amountMinor: 50000,
    date: new Date(2026, 7, 1),
    accountId: 0,
    toAccountId: null,
    categoryId: null,
    description: "Rent",
    tagIds: [],
    ...overrides,
  };
}

describe("ensureMaterialized / createRecurringSeries", () => {
  it("materializes monthly occurrences up to the rolling 3-month horizon", () => {
    const accountId = insertAccount(db);
    createRecurringSeries(db, baseInput({ accountId }), {
      intervalCount: 1,
      intervalUnit: "month",
      endDate: null,
    });

    const rows = db.select().from(transactions).orderBy(transactions.date).all();
    // Horizon is 2026-11-12 (today + 3 months); monthly from 2026-08-01
    // lands on 08-01, 09-01, 10-01, 11-01 — 12-01 is past the horizon.
    expect(rows.map((r) => toLocalDateString(r.date))).toEqual([
      "2026-08-01",
      "2026-09-01",
      "2026-10-01",
      "2026-11-01",
    ]);
    expect(rows.every((r) => r.isRecurringGenerated)).toBe(true);
    expect(rows.every((r) => r.occurrenceDate?.getTime() === r.date.getTime())).toBe(true);
  });

  it("is idempotent — calling ensureMaterialized again creates no duplicates", () => {
    const accountId = insertAccount(db);
    createRecurringSeries(db, baseInput({ accountId }), {
      intervalCount: 1,
      intervalUnit: "month",
      endDate: null,
    });

    ensureMaterialized(db);
    ensureMaterialized(db);

    const rows = db.select().from(transactions).all();
    expect(rows).toHaveLength(4);
  });

  it("extends materialization further out when `through` exceeds the default horizon", () => {
    const accountId = insertAccount(db);
    createRecurringSeries(db, baseInput({ accountId }), {
      intervalCount: 1,
      intervalUnit: "month",
      endDate: null,
    });

    ensureMaterialized(db, { through: new Date(2027, 1, 1) });

    const rows = db.select().from(transactions).all();
    // 08-01 through 2027-02-01 inclusive, monthly = 7 occurrences.
    expect(rows).toHaveLength(7);
  });

  it("stops at the rule's own end date even if before the horizon", () => {
    const accountId = insertAccount(db);
    createRecurringSeries(db, baseInput({ accountId }), {
      intervalCount: 1,
      intervalUnit: "month",
      endDate: new Date(2026, 8, 15), // 2026-09-15
    });

    const rows = db.select().from(transactions).all();
    expect(rows.map((r) => toLocalDateString(r.date))).toEqual([
      "2026-08-01",
      "2026-09-01",
    ]);
  });

  it("does not materialize a rule that starts after the horizon", () => {
    const accountId = insertAccount(db);
    createRecurringSeries(
      db,
      baseInput({ accountId, date: new Date(2027, 0, 1) }),
      { intervalCount: 1, intervalUnit: "month", endDate: null },
    );

    const rows = db.select().from(transactions).all();
    expect(rows).toHaveLength(0);
  });

  it("propagates recurring-rule tags onto every materialized occurrence", () => {
    const accountId = insertAccount(db);
    const [tag] = db.insert(tags).values({ name: "Subscription" }).returning({ id: tags.id }).all();
    createRecurringSeries(db, baseInput({ accountId, tagIds: [tag.id] }), {
      intervalCount: 1,
      intervalUnit: "month",
      endDate: null,
    });

    const links = db.select().from(transactionTags).all();
    expect(links).toHaveLength(4);
    expect(links.every((l) => l.tagId === tag.id)).toBe(true);
  });
});

describe("editSingleOccurrence", () => {
  it("changes the row but keeps occurrenceDate fixed as the schedule anchor", () => {
    const accountId = insertAccount(db);
    createRecurringSeries(db, baseInput({ accountId }), {
      intervalCount: 1,
      intervalUnit: "month",
      endDate: null,
    });
    const second = db
      .select()
      .from(transactions)
      .where(eq(transactions.date, new Date(2026, 8, 1)))
      .get()!;

    editSingleOccurrence(
      db,
      { id: second.id, recurringRuleId: second.recurringRuleId!, occurrenceDate: second.occurrenceDate! },
      baseInput({ accountId, amountMinor: 60000, date: new Date(2026, 8, 3) }),
    );

    const updated = db.select().from(transactions).where(eq(transactions.id, second.id)).get()!;
    expect(updated.amountMinor).toBe(60000);
    expect(toLocalDateString(updated.date)).toBe("2026-09-03");
    expect(toLocalDateString(updated.occurrenceDate!)).toBe("2026-09-01");
    expect(updated.isRecurringException).toBe(true);
  });

  it("does not get duplicated or reverted by a later ensureMaterialized call", () => {
    const accountId = insertAccount(db);
    createRecurringSeries(db, baseInput({ accountId }), {
      intervalCount: 1,
      intervalUnit: "month",
      endDate: null,
    });
    const second = db
      .select()
      .from(transactions)
      .where(eq(transactions.date, new Date(2026, 8, 1)))
      .get()!;
    editSingleOccurrence(
      db,
      { id: second.id, recurringRuleId: second.recurringRuleId!, occurrenceDate: second.occurrenceDate! },
      baseInput({ accountId, amountMinor: 60000, date: new Date(2026, 8, 1) }),
    );

    ensureMaterialized(db);

    const rows = db.select().from(transactions).all();
    expect(rows).toHaveLength(4);
    const stillEdited = rows.find((r) => r.id === second.id)!;
    expect(stillEdited.amountMinor).toBe(60000);
  });
});

describe("deleteSingleOccurrence", () => {
  it("removes just that row and does not get regenerated later", () => {
    const accountId = insertAccount(db);
    createRecurringSeries(db, baseInput({ accountId }), {
      intervalCount: 1,
      intervalUnit: "month",
      endDate: null,
    });
    const second = db
      .select()
      .from(transactions)
      .where(eq(transactions.date, new Date(2026, 8, 1)))
      .get()!;

    deleteSingleOccurrence(db, second.id);
    ensureMaterialized(db, { through: new Date(2027, 1, 1) });

    const dates = db
      .select()
      .from(transactions)
      .orderBy(transactions.date)
      .all()
      .map((r) => toLocalDateString(r.date));
    expect(dates).not.toContain("2026-09-01");
    expect(dates).toEqual(["2026-08-01", "2026-10-01", "2026-11-01", "2026-12-01", "2027-01-01", "2027-02-01"]);
  });
});

describe("editFutureOccurrences", () => {
  it("keeps past occurrences, replaces this-and-future with a new rule", () => {
    const accountId = insertAccount(db);
    createRecurringSeries(db, baseInput({ accountId }), {
      intervalCount: 1,
      intervalUnit: "month",
      endDate: null,
    });
    const third = db
      .select()
      .from(transactions)
      .where(eq(transactions.date, new Date(2026, 9, 1)))
      .get()!; // 2026-10-01

    editFutureOccurrences(
      db,
      { id: third.id, recurringRuleId: third.recurringRuleId!, occurrenceDate: third.occurrenceDate! },
      baseInput({ accountId, amountMinor: 70000, date: new Date(2026, 9, 5) }),
      null,
    );

    const rows = db.select().from(transactions).orderBy(transactions.date).all();
    // Past occurrences (Aug, Sep) untouched; Oct onward regenerated under
    // the new rule starting 2026-10-05, monthly, out to the horizon.
    expect(rows.map((r) => toLocalDateString(r.date))).toEqual([
      "2026-08-01",
      "2026-09-01",
      "2026-10-05",
      "2026-11-05",
    ]);
    expect(rows.filter((r) => r.amountMinor === 70000)).toHaveLength(2);

    const oldRule = db.select().from(recurringRules).where(eq(recurringRules.id, third.recurringRuleId!)).get()!;
    expect(oldRule.isActive).toBe(false);
    expect((oldRule.endDate ? toLocalDateString(oldRule.endDate) : undefined)).toBe("2026-09-30");
  });
});

describe("deleteFutureOccurrences", () => {
  it("keeps past occurrences, deletes this-and-future, and closes the rule", () => {
    const accountId = insertAccount(db);
    createRecurringSeries(db, baseInput({ accountId }), {
      intervalCount: 1,
      intervalUnit: "month",
      endDate: null,
    });
    const third = db
      .select()
      .from(transactions)
      .where(eq(transactions.date, new Date(2026, 9, 1)))
      .get()!;

    deleteFutureOccurrences(db, {
      id: third.id,
      recurringRuleId: third.recurringRuleId!,
      occurrenceDate: third.occurrenceDate!,
    });
    ensureMaterialized(db, { through: new Date(2027, 1, 1) });

    const dates = db
      .select()
      .from(transactions)
      .orderBy(transactions.date)
      .all()
      .map((r) => toLocalDateString(r.date));
    expect(dates).toEqual(["2026-08-01", "2026-09-01"]);

    const rule = db.select().from(recurringRules).where(eq(recurringRules.id, third.recurringRuleId!)).get()!;
    expect(rule.isActive).toBe(false);
  });
});

// Direct regression test for a live report: a rule created today
// (2026-08-12) with its first occurrence next month should materialize
// immediately and be findable by the exact same account+date-range query
// the Account Detail / Transactions screens use.
describe("a rule starting next month (reported scenario)", () => {
  it("materializes immediately on creation and is visible in a next-month range query", () => {
    const accountId = insertAccount(db);
    createRecurringSeries(
      db,
      baseInput({ accountId, date: new Date(2026, 8, 15) }), // 2026-09-15
      { intervalCount: 1, intervalUnit: "month", endDate: null },
    );

    const septemberRange = { start: new Date(2026, 8, 1), end: new Date(2026, 9, 1) };
    const septemberRows = db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.accountId, accountId),
          gte(transactions.date, septemberRange.start),
          lt(transactions.date, septemberRange.end),
        ),
      )
      .all();

    expect(septemberRows).toHaveLength(1);
    expect(toLocalDateString(septemberRows[0].date)).toBe("2026-09-15");

    // Nothing leaked into August's own range.
    const augustRange = { start: new Date(2026, 7, 1), end: new Date(2026, 8, 1) };
    const augustRows = db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.accountId, accountId),
          gte(transactions.date, augustRange.start),
          lt(transactions.date, augustRange.end),
        ),
      )
      .all();
    expect(augustRows).toHaveLength(0);
  });
});

describe("describeSchedule", () => {
  it("singularizes a 1-count interval and pluralizes others", () => {
    expect(describeSchedule(1, "month")).toBe("Repeats every month");
    expect(describeSchedule(2, "week")).toBe("Repeats every 2 weeks");
    expect(describeSchedule(1, "year")).toBe("Repeats every year");
  });
});

describe("monthlyEquivalent", () => {
  it("normalizes every unit to a monthly figure using average month/week length", () => {
    expect(monthlyEquivalent(120000, 1, "month")).toBeCloseTo(120000);
    // Every 1 year: spread over 12 months. Every 12 years (not "12/year")
    // would instead be amount / (12*12) — intervalCount multiplies the
    // denominator, it isn't "times per year".
    expect(monthlyEquivalent(120000, 1, "year")).toBeCloseTo(10000);
    expect(monthlyEquivalent(700, 1, "week")).toBeCloseTo(700 * (365.25 / 12 / 7));
    expect(monthlyEquivalent(100, 1, "day")).toBeCloseTo(100 * (365.25 / 12));
  });
});
