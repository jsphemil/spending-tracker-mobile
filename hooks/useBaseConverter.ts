import { useCallback, useEffect, useMemo, useState } from "react";

import { db } from "../db/client";
import { useSettings } from "../db/queries/settings";
import { getRatesToBase } from "../services/currency";
import { majorToMinor, minorToMajor } from "../services/format";

export interface BaseConverter {
  baseCurrency: string;
  toBaseMinor: (amountMinor: number, currency: string) => number;
  /**
   * Foreign currencies still without a usable rate. `toBaseMinor` counts
   * these as 0, so any total covering them is understated — a screen
   * showing such a total can use this to say so instead of presenting a
   * confidently wrong figure.
   */
  unconvertedCurrencies: string[];
}

// One place for "convert these amounts into the user's base currency."
//
// This logic used to be copy-pasted into six screens — the same
// foreignCurrencies memo, rates state, fetch effect and toBaseMinor
// function each time — which is how they drifted: five called the batched,
// cache-backed getRatesToBase, while the tag detail screen called
// getExchangeRate per currency inside an uncaught Promise.all. That one
// throws when a rate is missing, so a single unavailable currency rejected
// the whole batch and left *every* amount on that screen converting to 0.
//
// Pass whatever currencies the screen actually shows; duplicates, nulls and
// the base currency itself are all filtered out here.
export function useBaseConverter(
  currencies: readonly (string | null | undefined)[],
): BaseConverter {
  const { settings } = useSettings();
  const baseCurrency = settings?.baseCurrency ?? "INR";

  // Sorted so the dependency key below doesn't change just because the
  // caller's array arrived in a different order.
  const currencyKey = currencies.filter(Boolean).join("|");
  const foreign = useMemo(() => {
    const set = new Set<string>();
    for (const currency of currencies) {
      if (currency && currency !== baseCurrency) set.add(currency);
    }
    return Array.from(set).sort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currencyKey, baseCurrency]);

  const [rates, setRates] = useState<Record<string, number>>({});
  const foreignKey = foreign.join("|");
  useEffect(() => {
    let cancelled = false;
    getRatesToBase(db, foreign, baseCurrency).then((result) => {
      if (!cancelled) setRates(result);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foreignKey, baseCurrency]);

  const toBaseMinor = useCallback(
    (amountMinor: number, currency: string): number => {
      if (currency === baseCurrency) return amountMinor;
      const rate = rates[currency];
      if (rate === undefined) return 0;
      return majorToMinor(minorToMajor(amountMinor, currency) * rate, baseCurrency);
    },
    [rates, baseCurrency],
  );

  const unconvertedCurrencies = useMemo(
    () => foreign.filter((currency) => rates[currency] === undefined),
    [foreign, rates],
  );

  return { baseCurrency, toBaseMinor, unconvertedCurrencies };
}
