import { useMemo } from "react";
import { Link } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";

import { ScreenHeader } from "../components/ScreenHeader";
import { UnconvertedCurrenciesNote } from "../components/UnconvertedCurrenciesNote";
import { Icon } from "../components/ui/Icon";
import { useSettings } from "../db/queries/settings";
import { useMonthPosition } from "../hooks/useMonthPosition";
import { toggleNetWorthHidden, useNetWorthHidden } from "../hooks/useNetWorthHidden";
import { formatMoney } from "../services/format";
import { currentMonthPeriod } from "../services/period";
import { useThemeColors } from "../theme/palette";

// Net worth detail (spec.md §5.24): the Dashboard shows one number; this
// is where its parts live — the Assets/Debt/Earmarked/Unallocated tiles
// and the "available this month" line that used to sit on the V2
// Dashboard. Same useMonthPosition figures, current month, same privacy
// mask as the Dashboard.
export default function NetWorthScreen() {
  const colors = useThemeColors();
  const { settings } = useSettings();
  const baseCurrency = settings?.baseCurrency ?? "INR";
  const period = useMemo(() => currentMonthPeriod(), []);
  const p = useMonthPosition(period);
  const hidden = useNetWorthHidden();
  const money = (minor: number) => (hidden ? "••••" : formatMoney(minor, baseCurrency));

  return (
    <View className="flex-1 bg-bg">
      <ScreenHeader title="Net worth" back>
        <Pressable
          onPress={toggleNetWorthHidden}
          accessibilityRole="button"
          accessibilityLabel={hidden ? "Show amounts" : "Hide amounts"}
          className="h-11 w-11 items-center justify-center"
        >
          <Icon name={hidden ? "eye-off" : "eye"} size={20} color={colors.fgMuted} />
        </Pressable>
      </ScreenHeader>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Text className="font-data text-4xl font-bold tabular-nums text-fg">
          {hidden ? "••••••" : formatMoney(p.netWorthMinor, baseCurrency)}
        </Text>
        {!hidden && <UnconvertedCurrenciesNote currencies={p.unconvertedCurrencies} subject="Net worth" />}

        <Section title="What it's made of">
          <Row label="Assets" hint="Savings, cash, deposits and investments in credit" value={money(p.assetsMinor)} />
          <Row
            label="Debt"
            hint="Owed on credit cards"
            value={hidden ? "••••" : p.debtMinor > 0 ? formatMoney(p.debtMinor, baseCurrency) : "—"}
          />
          {p.earmarkedMinor !== 0 && (
            <>
              <Row label="Earmarked" hint="Set aside in your funds" value={money(p.earmarkedMinor)} />
              <Row label="Unallocated" hint="Net worth not earmarked" value={money(p.unallocatedMinor)} />
            </>
          )}
        </Section>

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

        <Link href="/analytics" asChild>
          <Pressable accessibilityRole="link" className="mt-8 flex-row items-center gap-1 py-2">
            <Text className="text-sm font-medium text-accent">See the trend in Analytics</Text>
            <Icon name="chevron-right" size={16} color={colors.accent} />
          </Pressable>
        </Link>
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
