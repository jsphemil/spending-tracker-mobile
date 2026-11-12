import type { ExportRow } from "../services/export";
import { buildStatementHtml, statementTotals } from "../services/pdfReport";

const row = (o: Partial<ExportRow>): ExportRow => ({
  date: new Date(2026, 10, 5),
  type: "expense",
  account: "SBI",
  category: "Shopping",
  description: "",
  amountMinor: 10000,
  currency: "INR",
  tags: [],
  recurring: false,
  fund: "",
  isOpeningBalance: false,
  ...o,
});

describe("PDF statement", () => {
  const rows = [
    row({ type: "income", amountMinor: 500000, category: "Opening Balance", isOpeningBalance: true }),
    row({ type: "income", amountMinor: 200000, category: "Salary" }),
    row({ amountMinor: 30000 }),
    row({ amountMinor: -5000, description: "Returned shoes" }),
    row({ type: "transfer", amountMinor: 1000, account: "SBI → Wallet" }),
    row({ currency: "USD", amountMinor: 1200 }),
  ];

  it("totals per currency, nets refunds, skips opening balances", () => {
    const t = statementTotals(rows);
    expect(t.get("INR")).toEqual({ income: 200000, spending: 25000, transfers: 1000 });
    expect(t.get("USD")).toEqual({ income: 0, spending: 1200, transfers: 0 });
  });

  it("marks refunds, signs amounts, and escapes user text", () => {
    const html = buildStatementHtml([...rows, row({ description: "<script>x</script>" })], {
      from: new Date(2026, 10, 1),
      to: new Date(2026, 10, 30),
      accountNames: [],
    });
    expect(html).toContain("Returned shoes · Shopping · Refund");
    expect(html).toContain("+₹50.00");
    expect(html).toContain("−₹300.00");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>x");
    expect(html).toContain("All accounts");
    expect(html).toContain("Transactions (7)");
  });
});
