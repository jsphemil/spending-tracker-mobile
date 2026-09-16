import { summarizeTags } from "../services/tagSummary";

const toBase = (amountMinor: number, currency: string) => (currency === "AED" ? amountMinor * 22 : amountMinor);
const base = { icon: "tag-outline", color: "#6366F1" };

describe("summarizeTags", () => {
  it("folds per-currency rows into one base-currency net per tag", () => {
    const rows = [
      { id: 1, name: "Trip", ...base, currency: "INR", txCount: 2, incomeMinor: 5_000, expenseMinor: 12_000 },
      { id: 1, name: "Trip", ...base, currency: "AED", txCount: 1, incomeMinor: 0, expenseMinor: 100 },
    ];
    expect(summarizeTags(rows, toBase)).toEqual([
      { id: 1, name: "Trip", ...base, txCount: 3, netMinor: 5_000 - 12_000 - 2_200 },
    ]);
  });

  it("keeps a tag with no transactions at zero", () => {
    const rows = [{ id: 2, name: "Empty", ...base, currency: null, txCount: 0, incomeMinor: 0, expenseMinor: 0 }];
    expect(summarizeTags(rows, toBase)).toEqual([{ id: 2, name: "Empty", ...base, txCount: 0, netMinor: 0 }]);
  });

  it("preserves the incoming (name) order across tags", () => {
    const rows = [
      { id: 3, name: "A", ...base, currency: "INR", txCount: 1, incomeMinor: 1, expenseMinor: 0 },
      { id: 1, name: "B", ...base, currency: null, txCount: 0, incomeMinor: 0, expenseMinor: 0 },
      { id: 2, name: "C", ...base, currency: "INR", txCount: 1, incomeMinor: 0, expenseMinor: 1 },
    ];
    expect(summarizeTags(rows, toBase).map((t) => t.name)).toEqual(["A", "B", "C"]);
  });
});
