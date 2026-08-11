import { useEffect, useState } from "react";
import { Text, type TextProps } from "react-native";

import { db } from "../db/client";
import { getExchangeRate } from "../services/currency";
import { formatMoney, majorToMinor, minorToMajor } from "../services/format";

const BASE_CURRENCY = "INR";

interface CurrencyAmountProps extends TextProps {
  amountMinor: number;
  currency: string;
  /** e.g. a "+"/"-" sign shown before the native amount, kept in the same Text node so it wraps as one unit. */
  prefix?: string;
}

// Foreign-currency accounts show both figures wherever an amount appears
// (spec.md §5.4), e.g. "AED 500.00 · ≈ ₹11,310.00".
export function CurrencyAmount({
  amountMinor,
  currency,
  prefix = "",
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

  return (
    <Text {...textProps}>
      {prefix}
      {formatMoney(amountMinor, currency)}
      {baseEquivalent !== null ? ` · ≈ ${formatMoney(baseEquivalent, BASE_CURRENCY)}` : ""}
    </Text>
  );
}
