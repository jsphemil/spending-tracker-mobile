import { useEffect, useState } from "react";

import { db } from "../db/client";
import { useSettings } from "../db/queries/settings";
import { getExchangeRate } from "../services/currency";
import { majorToMinor, minorToMajor } from "../services/format";

// Shared by CurrencyAmount and any other "show the base-currency
// equivalent alongside a native-currency figure" spot (e.g. Account
// Detail's rings) — null whenever `currency` already equals the app's
// live base currency, so a caller never needs to duplicate that check.
export function useBaseCurrencyEquivalent(
  amountMinor: number,
  currency: string,
): { baseEquivalentMinor: number | null; baseCurrency: string } {
  const { settings } = useSettings();
  const baseCurrency = settings?.baseCurrency ?? "INR";
  const [baseEquivalentMinor, setBaseEquivalentMinor] = useState<number | null>(null);

  useEffect(() => {
    if (currency === baseCurrency) {
      setBaseEquivalentMinor(null);
      return;
    }
    let cancelled = false;
    getExchangeRate(db, currency, baseCurrency).then((rate) => {
      if (!cancelled) {
        setBaseEquivalentMinor(majorToMinor(minorToMajor(amountMinor, currency) * rate, baseCurrency));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [amountMinor, currency, baseCurrency]);

  return { baseEquivalentMinor, baseCurrency };
}
