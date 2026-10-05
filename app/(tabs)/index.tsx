import { Fragment, useEffect, useMemo, type ReactNode } from "react";
import { Link, type Href } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";

import { FundRow } from "../../components/FundRow";
import { HeaderAction, ScreenHeader } from "../../components/ScreenHeader";
import { FirstVisitHint } from "../../components/FirstVisitHint";
import { UnconvertedCurrenciesNote } from "../../components/UnconvertedCurrenciesNote";
import { WhatsNewSheet } from "../../components/WhatsNewSheet";
import { Icon } from "../../components/ui/Icon";
import { shouldShowWhatsNew } from "../../constants/changelog";
import { parseDashboardLayout, type CardId } from "../../constants/dashboardCards";
import { updateSettings } from "../../db/actions/settings";
import { db } from "../../db/client";
import { useCategories } from "../../db/queries/categories";
import { useFunds } from "../../db/queries/funds";
import { useSettings } from "../../db/queries/settings";
import { useFilteredTransactions } from "../../db/queries/transactions";
import { useMonthPosition } from "../../hooks/useMonthPosition";
import { toggleNetWorthHidden, useNetWorthHidden } from "../../hooks/useNetWorthHidden";
import { appVersionLabel } from "../../services/feedbackLink";
import { formatMoney } from "../../services/format";
import { computeFundProgress, emptyFundBalance } from "../../services/funds";
import { currentMonthPeriod, monthRange, shiftMonth, type MonthPeriod } from "../../services/period";
import { ensureMaterialized } from "../../services/recurrence";
import { useThemeColors, type ThemeColors } from "../../theme/palette";
import { TAB_BAR_CLEARANCE } from "../../theme/tabBar";

const COMMITMENT_LOOKAHEAD_DAYS = 7;
// The most fund-relevant window: near enough to act on, far enough to
// still be able to. Anything further out isn't "attention" yet.
const FUND_DUE_SOON_DAYS = 30;
const DASHBOARD_FUND_LIMIT = 3;

function greeting(now: Date): string {
  const hour = now.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function monthName({ year, month }: MonthPeriod): string {
  return new Date(year, month, 1).toLocaleDateString(undefined, { month: "long" });
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

// Dashboard V4 (spec.md §5.24): "at a glance first, details when I ask".
// Four questions, one section each — where do I stand (net worth and how
// it moved), how is this month going, what am I saving for, and what needs
// attention. Everything deeper is one tap away: net worth → its detail
// screen, the month → Analytics. Always the current month (no month
// arrows); the figures come from useMonthPosition, unchanged from V2.
export default function DashboardScreen() {
  const colors = useThemeColors();
  const { settings } = useSettings();
  const baseCurrency = settings?.baseCurrency ?? "INR";
  const { data: categories } = useCategories();
  const { data: funds } = useFunds();

  const period = useMemo(() => currentMonthPeriod(), []);
  const {
    accounts,
    toBaseMinor,
    unconvertedCurrencies,
    netWorthMinor,
    netWorthChangeMinor,
    fundBalances,
    earmarkedMinor,
    incomeMinor,
    expenseMinor,
    lastMonthExpenseMinor,
  } = useMonthPosition(period);

  const activeFunds = (funds ?? []).filter((f) => f.status === "active");
  const dashboardFunds = activeFunds.slice(0, DASHBOARD_FUND_LIMIT);

  // ---- ATTENTION (always "right now") ----
  const currentRange = useMemo(() => monthRange(currentMonthPeriod()), []);
  const { data: currentMonthTx } = useFilteredTransactions({ range: currentRange });

  const spendByCategory = new Map<number, number>();
  for (const t of currentMonthTx ?? []) {
    if (t.type !== "expense" || t.categoryId === null) continue;
    const acctCurrency = accounts?.find((a) => a.id === t.accountId)?.currency ?? baseCurrency;
    spendByCategory.set(t.categoryId, (spendByCategory.get(t.categoryId) ?? 0) + toBaseMinor(t.amountMinor, acctCurrency));
  }
  const overBudgetCategories = (categories ?? [])
    .filter((c) => c.kind === "expense" && c.monthlyBudgetMinor != null)
    .map((c) => ({ ...c, spentMinor: spendByCategory.get(c.id) ?? 0 }))
    .filter((c) => c.spentMinor > c.monthlyBudgetMinor!);

  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);
  const lookaheadEnd = useMemo(
    () => new Date(today.getFullYear(), today.getMonth(), today.getDate() + COMMITMENT_LOOKAHEAD_DAYS),
    [today],
  );
  useEffect(() => {
    ensureMaterialized(db, { through: lookaheadEnd });
  }, [lookaheadEnd]);
  const { data: upcomingTx } = useFilteredTransactions({ range: { start: today, end: lookaheadEnd } });
  const upcomingCommitments = useMemo(() => {
    const seen = new Set<number>();
    const rows: { id: number; label: string; amount: string; date: Date }[] = [];
    for (const t of (upcomingTx ?? []).slice().sort((a, b) => a.date.getTime() - b.date.getTime())) {
      if (t.recurringRuleId == null || seen.has(t.recurringRuleId)) continue;
      if (t.type !== "expense" && t.type !== "transfer") continue;
      seen.add(t.recurringRuleId);
      const account = accounts?.find((a) => a.id === t.accountId);
      const category = categories?.find((c) => c.id === t.categoryId);
      rows.push({
        id: t.id,
        // A note ("Netflix") identifies a charge better than its category
        // ("Subscriptions"), so it wins when there is one.
        label:
          t.description ||
          (t.type === "transfer" ? `Transfer from ${account?.name ?? "?"}` : (category?.name ?? "Uncategorized")),
        amount: formatMoney(t.amountMinor, account?.currency ?? baseCurrency),
        date: t.date,
      });
    }
    return rows;
  }, [upcomingTx, accounts, categories, baseCurrency]);

  // Both fund alerts are real, actionable and derived from real data —
  // §5.19 forbids invented alerts, and a "you haven't contributed this
  // month" nag would cut against Funds' deliberately non-judgemental
  // design (contributions are irregular on purpose).
  const fundsDueSoon = useMemo(() => {
    const cutoff = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + FUND_DUE_SOON_DAYS,
    );
    return activeFunds
      .filter((fund) => fund.targetDate != null && fund.targetDate <= cutoff)
      .map((fund) => ({
        fund,
        progress: computeFundProgress(
          fund.targetAmountMinor,
          fundBalances.get(fund.id) ?? emptyFundBalance(fund.id),
        ),
      }))
      .filter(({ progress }) => !progress.isFullyFunded);
    // fundBalances is rebuilt every render from a synchronous read, so it
    // can't be a dependency without defeating the memo; the fund rows and
    // today are what actually change the result.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [funds, today]);

  const overEarmarked = earmarkedMinor > netWorthMinor;

  const shortDate = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });

  // One summary row per kind, not one row per item (§5.24 "Needs
  // attention"): the count says how much, the second line names the most
  // pressing one, and the destination screen has the rest.
  const attentionRows: AttentionRowProps[] = [];
  if (overBudgetCategories.length > 0) {
    attentionRows.push({
      icon: "shape-outline",
      tone: "danger",
      text: `${plural(overBudgetCategories.length, "category", "categories")} over budget`,
      detail: overBudgetCategories.map((c) => c.name).join(", "),
      href: "/categories",
    });
  }
  if (upcomingCommitments.length > 0) {
    const next = upcomingCommitments[0];
    attentionRows.push({
      icon: "calendar-sync-outline",
      tone: "warning",
      text: `${plural(upcomingCommitments.length, "commitment", "commitments")} due this week`,
      detail: `Next: ${next.label}, ${next.amount} on ${shortDate(next.date)}`,
      href: "/commitments",
    });
  }
  if (fundsDueSoon.length > 0) {
    const { fund, progress } = fundsDueSoon[0];
    attentionRows.push({
      icon: "piggy-bank",
      tone: "warning",
      text: `${plural(fundsDueSoon.length, "fund needs", "funds need")} money soon`,
      detail: `${fund.name} is ${formatMoney(progress.remainingMinor, baseCurrency)} short, needed by ${shortDate(fund.targetDate!)}`,
      href: "/fund",
    });
  }
  if (overEarmarked) {
    attentionRows.push({
      icon: "piggy-bank",
      tone: "danger",
      text: "You've earmarked more than your net worth",
      href: "/fund",
    });
  }

  const displayName = settings?.displayName?.trim();

  // Dashboard privacy toggle (spec.md §5.19) — Dashboard is the first
  // screen shown on app open, so net worth starts masked and a reveal
  // lasts only for this session. See hooks/useNetWorthHidden.ts for why
  // this isn't a persisted setting.
  const netWorthHidden = useNetWorthHidden();

  const { appVersion } = appVersionLabel();
  const layout = parseDashboardLayout(settings?.dashboardLayout);
  const whatsNewVisible = settings ? shouldShowWhatsNew(settings, appVersion) : false;

  const lastMonthName = monthName(shiftMonth(period, -1));
  const spendChangePercent =
    lastMonthExpenseMinor > 0 ? Math.round(((expenseMinor - lastMonthExpenseMinor) / lastMonthExpenseMinor) * 100) : null;

  // Dashboard customisation (spec.md §5.22): each section is a value in
  // this map and the saved layout decides order and visibility.
  const sections: Record<CardId, ReactNode> = {
    netWorth: (
      <Link href="/net-worth" asChild>
        <Pressable accessibilityRole="button" accessibilityHint="Opens net worth details">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-1">
              <Text className="text-sm text-fg-muted">Net worth</Text>
              <Icon name="chevron-right" size={14} color={colors.fgSubtle} />
            </View>
            <Pressable
              onPress={toggleNetWorthHidden}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={netWorthHidden ? "Show net worth" : "Hide net worth"}
              className="h-11 w-11 items-center justify-center"
            >
              <Icon name={netWorthHidden ? "eye-off" : "eye"} size={18} color={colors.fgMuted} />
            </Pressable>
          </View>
          <Text className="font-data text-4xl font-bold tabular-nums text-fg">
            {netWorthHidden ? "••••••" : formatMoney(netWorthMinor, baseCurrency)}
          </Text>
          {!netWorthHidden && <NetWorthChange changeMinor={netWorthChangeMinor} currency={baseCurrency} />}
          {!netWorthHidden && netWorthMinor < 0 && (
            <Text className="mt-1 text-xs font-medium text-danger">
              Overdrawn by {formatMoney(Math.abs(netWorthMinor), baseCurrency)}
            </Text>
          )}
          {!netWorthHidden && <UnconvertedCurrenciesNote currencies={unconvertedCurrencies} subject="Net worth" />}
        </Pressable>
      </Link>
    ),
    month: (
      <Link href="/analytics" asChild>
        <Pressable accessibilityRole="button" accessibilityHint="Opens Analytics">
          <SectionTitle title={monthName(period)} />
          <View className="flex-row gap-4">
            <View className="flex-1">
              <Text className="text-sm text-fg-muted">Income</Text>
              <Text className="font-data mt-0.5 text-xl font-semibold tabular-nums text-fg">
                {formatMoney(incomeMinor, baseCurrency)}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-sm text-fg-muted">Spending</Text>
              <Text className="font-data mt-0.5 text-xl font-semibold tabular-nums text-fg">
                {formatMoney(expenseMinor, baseCurrency)}
              </Text>
              {spendChangePercent !== null && (
                <Text className="mt-0.5 text-xs text-fg-muted">
                  {spendChangePercent === 0
                    ? `Same as ${lastMonthName}`
                    : `${spendChangePercent > 0 ? "↑" : "↓"} ${Math.abs(spendChangePercent)}% vs ${lastMonthName}`}
                </Text>
              )}
            </View>
          </View>
        </Pressable>
      </Link>
    ),
    funds: (
      <View>
        <SectionTitle title="Funds" link={(funds ?? []).length > 0 ? { label: "See all", href: "/fund" } : undefined} />
        {activeFunds.length === 0 ? (
          <View className="gap-2">
            <Text className="text-sm text-fg-muted">
              Set money aside for something specific — a laptop, a trip, next year&rsquo;s insurance — without
              moving it out of your accounts.
            </Text>
            <Link href="/fund/new" asChild>
              <Pressable accessibilityRole="button" hitSlop={8} className="self-start py-2">
                <Text className="text-sm font-semibold text-accent">Create a fund</Text>
              </Pressable>
            </Link>
          </View>
        ) : (
          <View className="gap-5">
            {dashboardFunds.map((fund) => (
              <FundRow
                key={fund.id}
                fund={fund}
                balance={fundBalances.get(fund.id) ?? emptyFundBalance(fund.id)}
                progress={computeFundProgress(
                  fund.targetAmountMinor,
                  fundBalances.get(fund.id) ?? emptyFundBalance(fund.id),
                )}
                baseCurrency={baseCurrency}
                hidden={netWorthHidden}
              />
            ))}
          </View>
        )}
      </View>
    ),
    attention: (
      <View>
        <SectionTitle title="Needs attention" />
        {attentionRows.length === 0 ? (
          <Text className="text-sm text-fg-muted">Nothing right now — you&rsquo;re all caught up.</Text>
        ) : (
          <View className="gap-2">
            {attentionRows.map((row) => (
              <AttentionRow key={row.text} {...row} />
            ))}
          </View>
        )}
      </View>
    ),
  };

  const visibleSections = layout.order.filter((id) => !layout.hidden.includes(id));

  return (
    <View className="flex-1 bg-bg">
      <ScreenHeader title="Erebor" brand>
        <HeaderAction icon="settings-outline" label="Settings" href="/settings" />
      </ScreenHeader>
      {settings && (
        <WhatsNewSheet
          version={appVersion}
          visible={whatsNewVisible}
          onClose={() => updateSettings(settings.id, { lastSeenVersion: appVersion })}
        />
      )}
      <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ padding: 20, paddingBottom: TAB_BAR_CLEARANCE }}>
        <FirstVisitHint id="dashboard" className="mb-5" />
        <Text className="mb-5 text-lg font-display text-fg">
          {displayName ? `${greeting(new Date())}, ${displayName}` : greeting(new Date())}
        </Text>
        {visibleSections.map((id, i) => (
          <Fragment key={id}>
            {i > 0 && <View className="my-6 h-px bg-border" />}
            {sections[id]}
          </Fragment>
        ))}
      </ScrollView>
    </View>
  );
}

function SectionTitle({ title, link }: { title: string; link?: { label: string; href: Href } }) {
  return (
    <View className="mb-3 flex-row items-center justify-between">
      <Text accessibilityRole="header" className="font-display text-base text-fg">
        {title}
      </Text>
      {link && (
        <Link href={link.href} asChild>
          <Pressable accessibilityRole="link" hitSlop={12}>
            <Text className="text-sm font-medium text-accent">{link.label}</Text>
          </Pressable>
        </Link>
      )}
    </View>
  );
}

// Direction is carried by the arrow and the words, not colour alone.
function NetWorthChange({ changeMinor, currency }: { changeMinor: number; currency: string }) {
  if (changeMinor === 0) {
    return <Text className="mt-1 text-sm text-fg-muted">No change this month</Text>;
  }
  const up = changeMinor > 0;
  return (
    <Text className={`mt-1 text-sm font-medium ${up ? "text-success" : "text-danger"}`}>
      {up ? "↑" : "↓"} {formatMoney(Math.abs(changeMinor), currency)} this month
    </Text>
  );
}

interface AttentionRowProps {
  icon: string;
  tone: keyof Pick<ThemeColors, "danger" | "warning">;
  text: string;
  detail?: string;
  href: Href;
}

function AttentionRow({ icon, tone, text, detail, href }: AttentionRowProps) {
  const colors = useThemeColors();
  return (
    <Link href={href} asChild>
      <Pressable
        accessibilityRole="button"
        className={`min-h-14 flex-row items-center gap-3 rounded-2xl px-3 py-3 ${tone === "danger" ? "bg-danger-soft" : "bg-warning-soft"}`}
      >
        <Icon name={icon} size={18} color={colors[tone]} />
        <View className="flex-1">
          <Text className="text-sm font-medium text-fg">{text}</Text>
          {detail && (
            <Text className="mt-0.5 text-xs text-fg-muted" numberOfLines={2}>
              {detail}
            </Text>
          )}
        </View>
        <Icon name="chevron-right" size={16} color={colors.fgSubtle} />
      </Pressable>
    </Link>
  );
}
