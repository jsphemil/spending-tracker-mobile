// Ported verbatim from the real web app's src/lib/services/csv.ts.

// RFC 4180: a field gets wrapped in quotes (with internal quotes doubled)
// whenever it contains a comma, quote, or newline — this is what makes CSV
// safe to open in Excel/Sheets even when a description has a comma in it.
function csvField(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: string[], rows: (string | number)[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(csvField).join(","));
  // Leading BOM so Excel (which guesses encoding from the first bytes, not
  // from the file extension) renders the ₹ sign and non-ASCII names
  // correctly instead of mangling them.
  return "﻿" + lines.join("\r\n");
}
