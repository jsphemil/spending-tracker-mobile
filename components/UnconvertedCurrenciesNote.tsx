import { Text } from "react-native";

interface UnconvertedCurrenciesNoteProps {
  currencies: string[];
  /** What the omission affects, e.g. "Net worth" or "These totals". */
  subject?: string;
}

// Shown wherever a total covers accounts in a currency the app currently
// has no exchange rate for. useBaseConverter counts those as 0, so the
// figure above is genuinely understated — and a wrong money figure with no
// explanation is exactly what this app has already been bitten by. Rates
// are cached indefinitely once fetched (services/currency.ts falls back to
// a stale rate rather than giving up), so in practice this only appears
// when a currency has never been fetched at all: a first run with no
// connection, or a newly added foreign account while offline.
export function UnconvertedCurrenciesNote({
  currencies,
  subject = "This total",
}: UnconvertedCurrenciesNoteProps) {
  if (currencies.length === 0) return null;

  const list =
    currencies.length === 1
      ? currencies[0]
      : `${currencies.slice(0, -1).join(", ")} and ${currencies[currencies.length - 1]}`;

  return (
    <Text className="mt-2 text-xs text-fg-muted">
      {subject} excludes {list} — no exchange rate available yet.
    </Text>
  );
}
