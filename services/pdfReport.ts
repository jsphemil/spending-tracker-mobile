import type { ExportRow } from "./export";
import { formatMoney } from "./format";

// The PDF statement (5.0.0): the same filtered rows as the CSV export,
// rendered as printable HTML for expo-print. Totals are per currency — the
// statement never converts, so every figure is exactly what was recorded.
// Opening balances are listed but kept out of the totals; refunds (negative
// expenses) reduce spending, as everywhere else in the app.

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const day = (d: Date) => d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

export interface StatementOptions {
  from: Date;
  to: Date; // inclusive
  /** Names of the accounts filtered to; empty = all accounts. */
  accountNames: string[];
  generatedAt?: Date;
}

export function statementTotals(rows: readonly ExportRow[]) {
  const byCurrency = new Map<string, { income: number; spending: number; transfers: number }>();
  for (const r of rows) {
    if (r.isOpeningBalance) continue;
    const t = byCurrency.get(r.currency) ?? { income: 0, spending: 0, transfers: 0 };
    if (r.type === "income") t.income += r.amountMinor;
    else if (r.type === "expense") t.spending += r.amountMinor;
    else t.transfers += r.amountMinor;
    byCurrency.set(r.currency, t);
  }
  return byCurrency;
}

function signedAmount(r: ExportRow): { text: string; cls: string } {
  const abs = formatMoney(Math.abs(r.amountMinor), r.currency);
  if (r.type === "transfer") return { text: abs, cls: "transfer" };
  if (r.type === "expense" && r.amountMinor >= 0) return { text: `−${abs}`, cls: "" };
  return { text: `+${abs}`, cls: "in" };
}

export function buildStatementHtml(rows: readonly ExportRow[], opts: StatementOptions): string {
  const totals = statementTotals(rows);
  const scope = opts.accountNames.length > 0 ? opts.accountNames.join(", ") : "All accounts";
  const summary = [...totals.entries()]
    .map(
      ([cur, t]) => `<tr><td>${esc(cur)}</td><td class="num in">${esc(formatMoney(t.income, cur))}</td>
        <td class="num">${esc(formatMoney(t.spending, cur))}</td>
        <td class="num">${esc(formatMoney(t.income - t.spending, cur))}</td>
        <td class="num transfer">${esc(formatMoney(t.transfers, cur))}</td></tr>`,
    )
    .join("");
  const body = rows
    .map((r) => {
      const amt = signedAmount(r);
      const isRefund = r.type === "expense" && r.amountMinor < 0;
      // The category only adds something when it differs from the note.
      const sameAsNote = r.description.trim().toLowerCase() === r.category.toLowerCase();
      const what = [r.description || r.category, r.description && !sameAsNote ? r.category : "", isRefund ? "Refund" : ""]
        .filter(Boolean)
        .join(" · ");
      return `<tr><td>${esc(day(r.date))}</td><td>${esc(what)}${
        r.tags.length ? `<div class="sub">${esc(r.tags.join(", "))}</div>` : ""
      }</td><td>${esc(r.account)}</td><td class="num ${amt.cls}">${esc(amt.text)}</td></tr>`;
    })
    .join("");

  return `<!doctype html><html><head><meta charset="utf-8"><style>
  body{font-family:-apple-system,Roboto,"Segoe UI",sans-serif;color:#1f1f1f;margin:28px;font-size:11px}
  h1{font-size:20px;margin:0 0 2px} .muted{color:#6b6b70} h2{font-size:13px;margin:22px 0 6px}
  table{width:100%;border-collapse:collapse} th{text-align:left;font-size:10px;color:#6b6b70;font-weight:600;border-bottom:1px solid #d4d4d8;padding:6px 4px}
  td{padding:6px 4px;border-bottom:1px solid #ececef;vertical-align:top} .num{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}
  .in{color:#2b7a57} .transfer{color:#6a5f88} .sub{color:#8e8e91;font-size:9px;margin-top:2px}
  </style></head><body>
  <h1>Erebor statement</h1>
  <div class="muted">${esc(day(opts.from))} – ${esc(day(opts.to))} · ${esc(scope)}</div>
  <div class="muted">Generated ${esc(day(opts.generatedAt ?? new Date()))}</div>
  <h2>Summary</h2>
  ${
    totals.size === 0
      ? `<p class="muted">No transactions in this period.</p>`
      : `<table><tr><th>Currency</th><th class="num">Income</th><th class="num">Spending</th><th class="num">Net</th><th class="num">Transfers</th></tr>${summary}</table>
  <p class="muted">Spending is after refunds. Opening balances are listed but not counted.</p>`
  }
  <h2>Transactions (${rows.length})</h2>
  <table><tr><th>Date</th><th>Details</th><th>Account</th><th class="num">Amount</th></tr>${body}</table>
  </body></html>`;
}
