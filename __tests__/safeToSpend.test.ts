import { countsTowardSafeToSpend, leftToSpendMinor, safeToSpendPerDayMinor } from "../services/safeToSpend";

describe("safe to spend", () => {
  it("defaults by type and honours the account's own toggle", () => {
    expect(countsTowardSafeToSpend({ type: "savings", safeToSpendEnabled: null })).toBe(true);
    expect(countsTowardSafeToSpend({ type: "wallet", safeToSpendEnabled: null })).toBe(true);
    for (const type of ["deposit", "investment", "credit_card"] as const) {
      expect(countsTowardSafeToSpend({ type, safeToSpendEnabled: null })).toBe(false);
    }
    expect(countsTowardSafeToSpend({ type: "savings", safeToSpendEnabled: false })).toBe(false);
    expect(countsTowardSafeToSpend({ type: "deposit", safeToSpendEnabled: true })).toBe(true);
  });

  it("uses available credit for a credit card", () => {
    expect(leftToSpendMinor({ type: "credit_card", creditLimitMinor: 100000 }, -30000)).toBe(70000);
    expect(leftToSpendMinor({ type: "savings", creditLimitMinor: null }, 50000)).toBe(50000);
  });

  it("splits over the remaining days and floors at zero", () => {
    expect(safeToSpendPerDayMinor(737500, 19)).toBe(38816);
    expect(safeToSpendPerDayMinor(-500, 10)).toBe(0);
  });
});
