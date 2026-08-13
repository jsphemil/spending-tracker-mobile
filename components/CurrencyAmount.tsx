import { Text, View, type TextProps } from "react-native";

import { useBaseCurrencyEquivalent } from "../hooks/useBaseCurrencyEquivalent";
import { formatMoney } from "../services/format";

interface CurrencyAmountProps extends TextProps {
  amountMinor: number;
  currency: string;
  /** e.g. a "+"/"-" sign shown before the native amount, kept in the same Text node so it wraps as one unit. */
  prefix?: string;
  /**
   * Render the ≈base equivalent on its own line below, in parens, instead
   * of inline after "·" — avoids several side-by-side amounts (e.g. the
   * Income/Expense/Balance row) running into each other on narrow columns.
   */
  stacked?: boolean;
}

// Foreign-currency accounts show both figures wherever an amount appears
// (spec.md §5.4), e.g. "AED 500.00 · ≈ ₹11,310.00" (or, when stacked,
// "AED 500.00" then "(≈ ₹11,310.00)" on the line below) — only when the
// account's currency actually differs from the app's live base currency;
// useBaseCurrencyEquivalent returns null otherwise.
export function CurrencyAmount({
  amountMinor,
  currency,
  prefix = "",
  stacked = false,
  className,
  ...textProps
}: CurrencyAmountProps) {
  const { baseEquivalentMinor, baseCurrency } = useBaseCurrencyEquivalent(amountMinor, currency);

  if (stacked) {
    return (
      <View style={{ alignItems: "center" }}>
        <Text className={`font-data tabular-nums ${className ?? ""}`} {...textProps}>
          {prefix}
          {formatMoney(amountMinor, currency)}
        </Text>
        {baseEquivalentMinor !== null ? (
          <Text className="font-data text-xs tabular-nums text-fg-subtle">
            (≈ {formatMoney(baseEquivalentMinor, baseCurrency)})
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <Text className={`font-data tabular-nums ${className ?? ""}`} {...textProps}>
      {prefix}
      {formatMoney(amountMinor, currency)}
      {baseEquivalentMinor !== null ? ` · ≈ ${formatMoney(baseEquivalentMinor, baseCurrency)}` : ""}
    </Text>
  );
}
