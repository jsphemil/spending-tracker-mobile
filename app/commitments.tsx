import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "../components/ui/Icon";

import { EmptyState } from "../components/ui/EmptyState";
import { ScreenHeader } from "../components/ScreenHeader";
import { FirstVisitHint } from "../components/FirstVisitHint";
import { useAccounts } from "../db/queries/accounts";
import { useCategories } from "../db/queries/categories";
import { useFunds } from "../db/queries/funds";
import { useActiveRecurringRules } from "../db/queries/recurringRules";
import { useSettings } from "../db/queries/settings";
import { formatMoney } from "../services/format";
import { describeSchedule, monthlyEquivalent, nextOccurrence } from "../services/recurrence";
import { useThemeColors } from "../theme/palette";

const SECTION_DEFS = [
  { type: "expense" as const, title: "Recurring expenses", color: "text-fg" },
  { type: "transfer" as const, title: "Recurring transfers & investments", color: "text-transfer" },
  { type: "income" as const, title: "Recurring income (for reference)", color: "text-success" },
];

export default function CommitmentsScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const baseCurrency = settings?.baseCurrency ?? "INR";
  const { data: rules } = useActiveRecurringRules();
  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();
  const { data: funds } = useFunds();

  const accountName = (id: number | null) => accounts?.find((a) => a.id === id)?.name ?? "?";
  const categoryInfo = (id: number | null) => categories?.find((c) => c.id === id);
  const fundName = (id: number | null) =>
    id == null ? null : (funds?.find((f) => f.id === id)?.name ?? null);

  // Today at midnight, so an occurrence falling today still counts as next up.
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const rows = (rules ?? []).map((rule) => ({
    rule,
    monthly: monthlyEquivalent(rule.amountMinor, rule.intervalCount, rule.intervalUnit),
    next: nextOccurrence(rule, today),
  }));

  // Soonest first, so the list reads as the order things will actually happen —
  // the Dashboard's "what needs my attention" links here after naming a due
  // date, and this is where that date has to be findable. Ended rules (no next
  // occurrence) sink to the bottom.
  const sections = SECTION_DEFS.map((def) => ({
    ...def,
    rows: rows
      .filter((r) => r.rule.type === def.type)
      .sort((a, b) => (a.next?.getTime() ?? Infinity) - (b.next?.getTime() ?? Infinity)),
  })).filter((section) => section.rows.length > 0);

  const totalExpenseMonthly = rows
    .filter((r) => r.rule.type === "expense")
    .reduce((sum, r) => sum + r.monthly, 0);
  const totalTransferMonthly = rows
    .filter((r) => r.rule.type === "transfer")
    .reduce((sum, r) => sum + r.monthly, 0);
  const totalCommitmentMonthly = totalExpenseMonthly + totalTransferMonthly;
  const totalIncomeMonthly = rows
    .filter((r) => r.rule.type === "income")
    .reduce((sum, r) => sum + r.monthly, 0);
  const percentOfIncome = totalIncomeMonthly > 0 ? (totalCommitmentMonthly / totalIncomeMonthly) * 100 : null;

  return (
    <View className="flex-1 bg-bg">
      <ScreenHeader title="Commitments" back />
      <ScrollView
        className="flex-1 bg-bg"
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 96, gap: 16 }}
      >
      <FirstVisitHint id="commitments" />
      <Text className="text-sm text-fg-muted">
        Everything you&rsquo;re locked into every month, normalized from each rule&rsquo;s own
        cadence — a yearly charge and a weekly one both roll into one monthly figure here.
      </Text>

      <View>
        <Text className="text-sm text-fg-muted">Total committed</Text>
        <Text className="font-data mt-1 text-3xl font-bold tabular-nums text-fg">
          {formatMoney(totalCommitmentMonthly, baseCurrency)}/mo
        </Text>
        {percentOfIncome !== null && (
          <Text className="mt-1 text-xs text-fg-muted">
            {percentOfIncome.toFixed(0)}% of your {formatMoney(totalIncomeMonthly, baseCurrency)}/mo
            recurring income
          </Text>
        )}
      </View>

      {rows.length === 0 ? (
        <EmptyState message='No active recurring rules yet — mark a transaction "recurring" when you add it to start tracking commitments here.' />
      ) : (
        sections.map((section) => (
          <View key={section.title}>
            <Text accessibilityRole="header" className="mb-1 text-base font-display text-fg">{section.title}</Text>
            {section.rows.map(({ rule, monthly, next }, i) => (
              <View key={rule.id} className={`py-3 ${i > 0 ? "border-t border-border" : ""}`}>
                <View className="flex-row items-center justify-between gap-2">
                  <View className="flex-1 flex-row items-center gap-1.5">
                    {rule.type !== "transfer" &&
                      (categoryInfo(rule.categoryId) ? (
                        <Icon
                          name={categoryInfo(rule.categoryId)!.icon}
                          size={14}
                          color={colors.fgMuted}
                        />
                      ) : (
                        <Text className="text-sm">❓</Text>
                      ))}
                    <Text className="flex-1 text-sm font-medium text-fg">
                      {rule.type === "transfer"
                        ? `${accountName(rule.accountId)} → ${accountName(rule.toAccountId)}`
                        : `${categoryInfo(rule.categoryId)?.name ?? "Uncategorized"} · ${accountName(rule.accountId)}`}
                    </Text>
                  </View>
                  <Text className={`font-data text-sm font-medium tabular-nums ${section.color}`}>
                    {formatMoney(monthly, baseCurrency)}/mo
                  </Text>
                </View>
                <Text className="mt-0.5 text-xs text-fg-subtle">
                  {formatMoney(rule.amountMinor, baseCurrency)} ·{" "}
                  {describeSchedule(rule.intervalCount, rule.intervalUnit)}
                  {rule.description ? ` · ${rule.description}` : ""}
                </Text>
                <Text className="mt-0.5 text-xs text-fg-muted">
                  {next
                    ? `Next ${next.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}`
                    : "Ended"}
                </Text>
                {/* Commitments is where you look to see what a rule does, so
                    it's where "and it draws from this fund" belongs. */}
                {fundName(rule.fundId) && (
                  <Text className="mt-0.5 text-xs text-accent">
                    Draws from {fundName(rule.fundId)}
                  </Text>
                )}
              </View>
            ))}
          </View>
        ))
      )}
      </ScrollView>
    </View>
  );
}
