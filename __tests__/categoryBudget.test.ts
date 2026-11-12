import { budgetRange, spendByCategory } from "../services/categoryBudget";
import { toLocalDateString } from "../services/period";

describe("category budgets", () => {
  it("a yearly budget covers the financial year containing today", () => {
    const r = budgetRange("year", 4, new Date(2026, 10, 12));
    expect([toLocalDateString(r.start), toLocalDateString(r.end)]).toEqual(["2026-04-01", "2027-04-01"]);
  });

  it("nets refunds and converts each row from its account's currency", () => {
    const rows = [
      { type: "expense", categoryId: 1, accountId: 1, amountMinor: 30000 },
      { type: "expense", categoryId: 1, accountId: 1, amountMinor: -5000 },
      { type: "expense", categoryId: 1, accountId: 2, amountMinor: 100 },
      { type: "income", categoryId: 9, accountId: 1, amountMinor: 99999 },
      { type: "expense", categoryId: null, accountId: 1, amountMinor: 7 },
    ];
    const totals = spendByCategory(
      rows,
      (id) => (id === 2 ? "USD" : "INR"),
      (amt, cur) => (cur === "USD" ? amt * 90 : amt),
    );
    expect([...totals.entries()]).toEqual([[1, 34000]]);
  });
});
