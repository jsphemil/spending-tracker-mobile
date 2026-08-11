import { useEffect, useState } from "react";
import { Text, View, type TextProps } from "react-native";

import { db } from "../db/client";
import { getExchangeRate } from "../services/currency";
import { formatMoney, majorToMinor, minorToMajor } from "../services/format";

const BASE_CURRENCY = "INR";

interface CurrencyAmountProps extends TextProps {
  amountMinor: number;
  currency: string;
  /** e.g. a "+"/"-" sign shown before the native amount, kept in the same Text node so it wraps as one unit. */
  prefix?: string;
  /**
   * Render the ≈INR equivalent on its own line below, in parens, instead of
   * inline after "·" — avoids several side-by-side amounts (e.g. the
   * Income/Expense/Balance row) running into each other on narrow columns.
   */
  stacked?: boolean;
}

// Foreign-currency accounts show both figures wherever an amount appears
// (spec.md §5.4), e.g. "AED 500.00 · ≈ ₹11,310.00" (or, when stacked,
// "AED 500.00" then "(≈ ₹11,310.00)" on the line below).
export function CurrencyAmount({
  amountMinor,
  currency,
  prefix = "",
  stacked = false,
  className,
  ...textProps
}: CurrencyAmountProps) {
  const [baseEquivalent, setBaseEquivalent] = useState<number | null>(null);

  useEffect(() => {
    if (currency === BASE_CURRENCY) {
      setBaseEquivalent(null);
      return;
    }
    let cancelled = false;
    getExchangeRate(db, currency, BASE_CURRENCY).then((rate) => {
      if (!cancelled) {
        setBaseEquivalent(majorToMinor(minorToMajor(amountMinor, currency) * rate, BASE_CURRENCY));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [amountMinor, currency]);

  if (stacked) {
    return (
      <View style={{ alignItems: "center" }}>
        <Text className={`font-data tabular-nums ${className ?? ""}`} {...textProps}>
          {prefix}
          {formatMoney(amountMinor, currency)}
        </Text>
        {baseEquivalent !== null ? (
          <Text className="font-data text-xs tabular-nums text-fg-subtle">
            (≈ {formatMoney(baseEquivalent, BASE_CURRENCY)})
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <Text className={`font-data tabular-nums ${className ?? ""}`} {...textProps}>
      {prefix}
      {formatMoney(amountMinor, currency)}
      {baseEquivalent !== null ? ` · ≈ ${formatMoney(baseEquivalent, BASE_CURRENCY)}` : ""}
    </Text>
  );
}
