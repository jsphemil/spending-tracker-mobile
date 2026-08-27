import { ScrollView, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { EmptyState } from "../../components/ui/EmptyState";
import { useAccounts } from "../../db/queries/accounts";
import { useCategories } from "../../db/queries/categories";
import { useActiveRecurringRules } from "../../db/queries/recurringRules";
import { useSettings } from "../../db/queries/settings";
import { formatMoney } from "../../services/format";
import { describeSchedule, monthlyEquivalent } from "../../services/recurrence";
import { useThemeColors } from "../../theme/palette";

const SECTION_DEFS = [
  { type: "expense" as const, title: "Recurring expenses", color: "text-danger" },
  { type: "transfer" as const, title: "Recurring transfers & investments", color: "text-accent" },
  { type: "income" as const, title: "Recurring income (for reference)", color: "text-success" },
];

export default function CommitmentsScreen() {
  const colors = useThemeColors();
  const { settings } = useSettings();
  const baseCurrency = settings?.baseCurrency ?? "INR";
  const { data: rules } = useActiveRecurringRules();
  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();

  const accountName = (id: number | null) => accounts?.find((a) => a.id === id)?.name ?? "?";
  const categoryInfo = (id: number | null) => categories?.find((c) => c.id === id);

  const rows = (rules ?? []).map((rule) => ({
    rule,
    monthly: monthlyEquivalent(rule.amountMinor, rule.intervalCount, rule.intervalUnit),
  }));

  const sections = SECTION_DEFS.map((def) => ({
    ...def,
    rows: rows.filter((r) => r.rule.type === def.type).sort((a, b) => b.monthly - a.monthly),
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
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ padding: 16, gap: 16 }}>
      <Text className="text-sm text-fg-muted">
        Everything you&rsquo;re locked into every month, normalized from each rule&rsquo;s own
        cadence — a yearly charge and a weekly one both roll into one monthly figure here.
      </Text>

      <View className="rounded-xl border border-border bg-surface p-4">
        <Text className="text-xs text-fg-muted">Total committed</Text>
        <Text className="font-data mt-1 text-2xl font-semibold tabular-nums text-danger">
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
          <View key={section.title} className="rounded-xl border border-border bg-surface p-4">
            <Text className="mb-3 text-sm font-semibold text-fg">{section.title}</Text>
            {section.rows.map(({ rule, monthly }, i) => (
              <View key={rule.id} className={`py-2.5 ${i > 0 ? "border-t border-border" : ""}`}>
                <View className="flex-row items-center justify-between gap-2">
                  <View className="flex-1 flex-row items-center gap-1.5">
                    {rule.type !== "transfer" &&
                      (categoryInfo(rule.categoryId) ? (
                        <MaterialCommunityIcons
                          name={categoryInfo(rule.categoryId)!.icon as never}
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
              </View>
            ))}
          </View>
        ))
      )}
    </ScrollView>
  );
}
