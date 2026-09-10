import { eq, sql } from "drizzle-orm";

import { db } from "../client";
import { fundAllocations, funds, recurringRules, transactions } from "../schema";

// None of these call refreshAccountsWidget(): earmarking money changes no
// account balance and no net worth (spec.md §5.21), so the home screen
// widget's figures are untouched by anything in this file.

export interface FundInput {
  name: string;
  targetAmountMinor: number;
  targetDate: Date | null;
  icon: string;
  color: string;
}

export function createFund(input: FundInput): number {
  const [row] = db.insert(funds).values(input).returning({ id: funds.id }).all();
  return row.id;
}

// Deliberately does not touch status/closedAt — changing a target never
// releases money, even when the new target is below what's already funded
// (spec.md §5.21); the fund simply reads as overfunded.
export function updateFund(id: number, input: FundInput): void {
  db.update(funds).set(input).where(eq(funds.id, id)).run();
}

export interface FundAllocationInput {
  fundId: number;
  /** Signed: positive = added to the fund, negative = released from it. */
  amountMinor: number;
  date: Date;
  note?: string | null;
}

// Intentionally a dumb writer. "You can't release more than is funded" is
// enforced by the caller, because the funded figure depends on converting
// foreign-currency linked expenses to base — which needs the toBaseMinor
// the screen already holds, not something this layer can reach. Same split
// as createTransaction, which likewise leaves amount validation to the form.
export function addFundAllocation(input: FundAllocationInput): number {
  const [row] = db
    .insert(fundAllocations)
    .values({ ...input, note: input.note ?? null })
    .returning({ id: fundAllocations.id })
    .all();
  return row.id;
}

// Removing a single history entry is this app's stand-in for undo — there
// is no undo mechanism anywhere else either.
export function deleteFundAllocation(id: number): void {
  db.delete(fundAllocations).where(eq(fundAllocations.id, id)).run();
}

// Just a status change. services/funds.ts derives "a closed fund holds
// nothing from closedAt onward" from these two columns, which is what makes
// the fund's balance return to unallocated wealth.
//
// This used to also write a balancing release row sized to whatever the
// fund held at that moment. That assumed the fund's state at close was
// final, and it wasn't: deleting a linked expense afterwards un-consumed
// the fund and handed the money back to a fund the user had already closed,
// where it silently counted toward Earmarked again. Found on-device.
export function closeFund(id: number): void {
  db.update(funds)
    .set({ status: "closed", closedAt: new Date() })
    .where(eq(funds.id, id))
    .run();
}

// Reopening resumes earmarking whatever the ledger still holds — closing
// never spent that money, it only stopped setting it aside, so there's
// nothing to restore by hand.
export function reopenFund(id: number): void {
  db.update(funds).set({ status: "active", closedAt: null }).where(eq(funds.id, id)).run();
}

// Deleting a fund with history would silently unlink its expenses (the FK is
// "set null"), leaving past spending unexplained. Closing is the path for a
// fund that's been used; deletion stays available only for one created by
// mistake. Same shape as deleteAccount's "delete or move them first" guard.
export function deleteFund(id: number): void {
  const allocationCount = db
    .select({ count: sql<number>`count(*)` })
    .from(fundAllocations)
    .where(eq(fundAllocations.fundId, id))
    .get();
  const linkedCount = db
    .select({ count: sql<number>`count(*)` })
    .from(transactions)
    .where(eq(transactions.fundId, id))
    .get();
  // Recurring rules count too. Without this, deleting a fund would leave a
  // commitment silently unlinked ("set null") and every future instalment
  // would quietly stop drawing from it.
  const ruleCount = db
    .select({ count: sql<number>`count(*)` })
    .from(recurringRules)
    .where(eq(recurringRules.fundId, id))
    .get();

  const allocations = allocationCount?.count ?? 0;
  const linked = (linkedCount?.count ?? 0) + (ruleCount?.count ?? 0);
  if (allocations > 0 || linked > 0) {
    throw new Error(
      "This fund already has history — close it instead, which returns its balance to unallocated and keeps past spending intact.",
    );
  }

  db.delete(funds).where(eq(funds.id, id)).run();
}
