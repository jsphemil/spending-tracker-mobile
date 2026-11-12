import { useMemo } from "react";
import { ScrollView, Text, View } from "react-native";

import { AssetAllocationChart } from "../components/charts/AssetAllocationChart";
import { ScreenHeader } from "../components/ScreenHeader";
import { UnconvertedCurrenciesNote } from "../components/UnconvertedCurrenciesNote";
import { useSettings } from "../db/queries/settings";
import { useMonthPosition } from "../hooks/useMonthPosition";
import { formatMoney } from "../services/format";
import { currentMonthPeriod } from "../services/period";
import { useThemeColors, type ThemeColors } from "../theme/palette";

const ASSET_ALLOCATION_BUCKETS: { name: string; types: readonly string[]; chart: keyof ThemeColors }[] = [
  { name: "Liquid (Savings/Wallet)", types: ["savings", "wallet"], chart: "chart1" },
  { name: "Deposits (FD/RD)", types: ["deposit"], chart: "chart2" },
  { name: "Invested", types: ["investment"], chart: "chart3" },
];

// Net worth detail (spec.md §5.24): the Dashboard shows one number; this
// is where its parts live — the Assets/Debt/Earmarked/Unallocated tiles
// and the "available this month" line that used to sit on the V2
// Dashboard, and the asset allocation donut that used to sit on Analytics. Same useMonthPosition figures, current month.
export default function NetWorthScreen() {
  const colors = useThemeColors();
  const { settings } = useSettings();
  const baseCurrency = settings?.baseCurrency ?? "INR";
  const period = useMemo(() => currentMonthPeriod(), []);
  const p = useMonthPosition(period);
  const money = (minor: number) => formatMoney(minor, baseCurrency);

  // Moved verbatim from V2 Analytics: positive balances only, converted to
  // base, as of the same cutoff as every other figure here.
  const assetAllocation = ASSET_ALLOCATION_BUCKETS.map((bucket) => ({
    name: bucket.name,
    color: colors[bucket.chart],
    valueMinor: (p.accounts ?? [])
      .filter((a) => bucket.types.includes(a.type))
      .reduce((sum, a) => sum + Math.max(0, p.toBaseMinor(p.accountBalanceAsOf.get(a.id) ?? 0, a.currency)), 0),
  })).filter((b) => b.valueMinor > 0);

  return (
    <View className="flex-1 bg-bg">
      <ScreenHeader title="Net worth" back />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Text className="font-data text-4xl font-bold tabular-nums text-fg">
          {formatMoney(p.netWorthMinor, baseCurrency)}
        </Text>
        <UnconvertedCurrenciesNote currencies={p.unconvertedCurrencies} subject="Net worth" />

        <Section title="What it's made of">
          <Row label="Assets" hint="Savings, cash, deposits and investments with a positive balance" value={money(p.assetsMinor)} />
          <Row
            label="Debt"
            hint="Owed on credit cards"
            value={p.debtMinor > 0 ? formatMoney(p.debtMinor, baseCurrency) : "—"}
          />
          {p.earmarkedMinor !== 0 && (
            <>
              <Row label="Earmarked" hint="Set aside in your funds" value={money(p.earmarkedMinor)} />
              <Row label="Unallocated" hint="Net worth not earmarked" value={money(p.unallocatedMinor)} />
            </>
          )}
        </Section>

        {assetAllocation.length > 0 && (
          <Section title="How your assets are split">
            <View className="mt-3">
              <AssetAllocationChart data={assetAllocation} currency={baseCurrency} earmarkedMinor={p.earmarkedMinor} />
            </View>
          </Section>
        )}

        <Section title="This month">
          <Row label="Start of month" value={money(p.carryForwardMinor)} />
          <Row label="Income" value={money(p.incomeMinor)} />
          <Row label="Spending" value={money(p.expenseMinor)} />
          <Row
            label="Available this month"
            hint="Start of month + income − spending. Transfers between your accounts aren't spending."
            value={money(p.availableThisMonthMinor)}
          />
        </Section>

      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mt-8">
      <Text accessibilityRole="header" className="mb-1 font-display text-base text-fg">
        {title}
      </Text>
      {children}
    </View>
  );
}

function Row({ label, hint, value }: { label: string; hint?: string; value: string }) {
  return (
    <View className="flex-row items-center gap-4 border-b border-border py-3">
      <View className="flex-1">
        <Text className="text-base text-fg">{label}</Text>
        {hint && <Text className="mt-0.5 text-xs text-fg-muted">{hint}</Text>}
      </View>
      <Text className="font-data text-base tabular-nums text-fg">{value}</Text>
    </View>
  );
}
