import { useEffect, useMemo, useState } from "react";
import { Link } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Icon } from "../../components/ui/Icon";

import { GlobalHeader } from "../../components/GlobalHeader";
import { db } from "../../db/client";
import { useAccounts } from "../../db/queries/accounts";
import { useCategories } from "../../db/queries/categories";
import { useGoals } from "../../db/queries/goals";
import { useSettings } from "../../db/queries/settings";
import { useFilteredTransactions } from "../../db/queries/transactions";
import { getAccountBalanceMinor, getNetWorthSeries, getPeriodTotals } from "../../services/balance";
import { getRatesToBase } from "../../services/currency";
import { formatMoney, majorToMinor, minorToMajor } from "../../services/format";
import { computeGoalProgress } from "../../services/goals";
import {
  currentMonthPeriod,
  monthLabel,
  monthRange,
  shiftMonth,
} from "../../services/period";
import { ensureMaterialized } from "../../services/recurrence";
import { TAB_BAR_CLEARANCE } from "../../theme/tabBar";
import { useThemeColors } from "../../theme/palette";

const ASSET_TYPES = ["savings", "wallet", "deposit", "investment"] as const;
const COMMITMENT_LOOKAHEAD_DAYS = 7;
const GOAL_TRAILING_MONTHS = 6;

function greeting(now: Date): string {
  const hour = now.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

interface Shortcut {
  href: "/commitments" | "/categories" | "/goal" | "/tag" | "/calendar" | "/settings";
  icon: string;
  label: string;
}

// Only destinations without their own bottom tab (spec.md §5.19 "Dashboard
// navigation shortcuts") — never Accounts/Transactions/Analytics, never
// Profile (folded into Settings).
const SHORTCUTS: Shortcut[] = [
  { href: "/commitments", icon: "calendar-sync-outline", label: "Commitments" },
  { href: "/categories", icon: "shape-outline", label: "Categories" },
  { href: "/goal", icon: "target", label: "Goals" },
  { href: "/tag", icon: "tag-outline", label: "Tags" },
  { href: "/calendar", icon: "calendar-month-outline", label: "Calendar" },
  { href: "/settings", icon: "settings-outline", label: "Settings" },
];

// Dashboard V2 (spec.md §5.19): Position → Performance → Action. Reuses
// every calculation from the old Dashboard/Goals/Commitments screens as-is
// — no new financial formulas, just a different composition of them.
export default function DashboardScreen() {
  const colors = useThemeColors();
  const { settings } = useSettings();
  const baseCurrency = settings?.baseCurrency ?? "INR";
  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();
  const { data: goals } = useGoals();


  // Performance is the only month-scoped section — Position (net worth /
  // assets / debt) and Action are always "as of right now," same
  // today-anchored convention Goals and the debt-payoff projection already
  // use, so paging this month-nav never makes them lie.
  const [period, setPeriod] = useState(currentMonthPeriod());
  const range = useMemo(() => monthRange(period), [period]);
  useEffect(() => {
    ensureMaterialized(db, { through: range.end });
  }, [range.end]);

  const foreignCurrencies = useMemo(() => {
    const set = new Set<string>();
    for (const a of accounts ?? []) {
      if (a.currency !== baseCurrency) set.add(a.currency);
    }
    return Array.from(set);
  }, [accounts, baseCurrency]);

  const [rates, setRates] = useState<Record<string, number>>({});
  useEffect(() => {
    let cancelled = false;
    getRatesToBase(db, foreignCurrencies, baseCurrency).then((result) => {
      if (!cancelled) setRates(result);
    });
    return () => {
      cancelled = true;
    };
  }, [foreignCurrencies.join(","), baseCurrency]);

  function toBaseMinor(amountMinor: number, currency: string): number {
    if (currency === baseCurrency) return amountMinor;
    const rate = rates[currency];
    if (rate === undefined) return 0;
    return majorToMinor(minorToMajor(amountMinor, currency) * rate, baseCurrency);
  }

  // ---- POSITION (as of the viewed month) ----
  // `range.end` is required, not optional polish: getAccountBalanceMinor
  // with no cutoff sums an account's *entire* history, which includes
  // already-materialized future-dated recurring transactions (next month's
  // salary, etc.) and silently overstates net worth. It also has to be
  // range.end rather than a "now" timestamp so this figure keeps tracking
  // the month navigation, and so it agrees with the Accounts and Analytics
  // screens, which both already pass range.end.
  const accountBalanceAsOf = new Map(
    (accounts ?? []).map((a) => [a.id, getAccountBalanceMinor(db, a.id, range.end)]),
  );
  let netWorthMinor = 0;
  let assetsMinor = 0;
  let debtMinor = 0;
  for (const account of accounts ?? []) {
    const baseBalance = toBaseMinor(accountBalanceAsOf.get(account.id) ?? 0, account.currency);
    netWorthMinor += baseBalance;
    if (account.type === "credit_card") {
      if (baseBalance < 0) debtMinor += -baseBalance;
    } else if ((ASSET_TYPES as readonly string[]).includes(account.type) && baseBalance > 0) {
      assetsMinor += baseBalance;
    }
  }

  // ---- PERFORMANCE (viewed month) ----
  const { data: monthTransactions } = useFilteredTransactions({ range });
  let incomeMinor = 0;
  let expenseMinor = 0;
  let carryForwardMinor = 0;
  for (const account of accounts ?? []) {
    const totals = getPeriodTotals(db, { accountId: account.id, ...range });
    incomeMinor += toBaseMinor(totals.incomeMinor, account.currency);
    expenseMinor += toBaseMinor(totals.expenseMinor, account.currency);
    carryForwardMinor += toBaseMinor(getAccountBalanceMinor(db, account.id, range.start), account.currency);
  }
  const availableThisMonthMinor = carryForwardMinor + incomeMinor - expenseMinor;

  // Wealth history lived here behind a toggle, duplicating the Net worth
  // trend chart that Analytics shows unconditionally. Removed from the
  // Dashboard rather than kept in two places.

  // ---- ACTION (always "right now," independent of the Performance month-nav) ----
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
    const rows: { id: number; label: string; date: Date }[] = [];
    for (const t of (upcomingTx ?? []).slice().sort((a, b) => a.date.getTime() - b.date.getTime())) {
      if (t.recurringRuleId == null || seen.has(t.recurringRuleId)) continue;
      if (t.type !== "expense" && t.type !== "transfer") continue;
      seen.add(t.recurringRuleId);
      const account = accounts?.find((a) => a.id === t.accountId);
      const category = categories?.find((c) => c.id === t.categoryId);
      rows.push({
        id: t.id,
        label: t.type === "transfer" ? `Transfer from ${account?.name ?? "?"}` : (category?.name ?? "Uncategorized"),
        date: t.date,
      });
    }
    return rows;
  }, [upcomingTx, accounts, categories]);

  const sixMonthsAgo = useMemo(
    () => new Date(today.getFullYear(), today.getMonth() - GOAL_TRAILING_MONTHS, today.getDate()),
    [today],
  );
  const [netWorthPast, netWorthToday] = accounts
    ? getNetWorthSeries(db, accounts.map((a) => ({ id: a.id, currency: a.currency })), [sixMonthsAgo, today], toBaseMinor)
    : [0, 0];
  const goalMonthlyGrowth = (netWorthToday - netWorthPast) / GOAL_TRAILING_MONTHS;
  const behindPaceGoals = (goals ?? [])
    .map((g) => computeGoalProgress(g, netWorthToday, goalMonthlyGrowth, today))
    .filter((g) => g.isBehindTarget);

  const hasAttentionItems = overBudgetCategories.length > 0 || upcomingCommitments.length > 0 || behindPaceGoals.length > 0;

  const displayName = settings?.displayName?.trim();
  const card = "rounded-card border border-glass-border bg-glass p-4";
  const cardTitle = "mb-3 text-sm font-display text-fg";

  return (
    <View className="flex-1 bg-bg">
      <GlobalHeader />
      <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ padding: 16, paddingBottom: TAB_BAR_CLEARANCE, gap: 16 }}>
        <View>
          <Text className="text-lg font-display-xbold text-fg">
            {displayName ? `${greeting(new Date())}, ${displayName}` : greeting(new Date())}
          </Text>
          <Text className="text-sm text-fg-muted">Here&rsquo;s your financial picture at a glance.</Text>
        </View>

        {/* ---------- POSITION: Where do I stand? ---------- */}
        <View className={card}>
          <Text className="mb-1 text-xs font-semibold uppercase tracking-wide text-fg-muted">Net worth</Text>
          <Text className="font-data text-4xl font-bold tabular-nums text-fg">
            {formatMoney(netWorthMinor, baseCurrency)}
          </Text>
          {netWorthMinor < 0 && (
            <Text className="mt-1 text-xs font-medium text-danger">
              Overdrawn by {formatMoney(Math.abs(netWorthMinor), baseCurrency)}
            </Text>
          )}
          <View className="mt-4 flex-row gap-3">
            <View className="flex-1 rounded-card bg-surface-2 p-3">
              <Text className="text-[11px] text-fg-muted">Assets</Text>
              <Text className="font-data mt-1 text-base font-semibold tabular-nums text-success">
                {formatMoney(assetsMinor, baseCurrency)}
              </Text>
            </View>
            <View className="flex-1 rounded-card bg-surface-2 p-3">
              <Text className="text-[11px] text-fg-muted">Debt</Text>
              <Text className="font-data mt-1 text-base font-semibold tabular-nums text-fg">
                {debtMinor > 0 ? formatMoney(debtMinor, baseCurrency) : "—"}
              </Text>
            </View>
          </View>

        </View>

        {/* ---------- PERFORMANCE: How am I doing this month? ---------- */}
        <View className={card}>
          <View className="mb-3 flex-row items-center justify-between">
            <Pressable onPress={() => setPeriod((p) => shiftMonth(p, -1))} className="p-2" hitSlop={8}>
              <Icon name="chevron-left" size={22} color={colors.fg} />
            </Pressable>
            <Text className={cardTitle}>{monthLabel(period)}</Text>
            <Pressable onPress={() => setPeriod((p) => shiftMonth(p, 1))} className="p-2" hitSlop={8}>
              <Icon name="chevron-right" size={22} color={colors.fg} />
            </Pressable>
          </View>
          <View className="flex-row gap-3">
            <View className="flex-1 rounded-card bg-surface-2 p-3.5">
              <Text className="text-[11px] text-fg-muted">Actual income</Text>
              <Text className="font-data mt-1.5 text-lg font-semibold tabular-nums text-success">
                +{formatMoney(incomeMinor, baseCurrency)}
              </Text>
            </View>
            <View className="flex-1 rounded-card bg-surface-2 p-3.5">
              <Text className="text-[11px] text-fg-muted">Actual spending</Text>
              <Text className="font-data mt-1.5 text-lg font-semibold tabular-nums text-danger">
                −{formatMoney(expenseMinor, baseCurrency)}
              </Text>
            </View>
          </View>
          <Text className="mt-3 text-xs text-fg-muted">
            {formatMoney(availableThisMonthMinor, baseCurrency)} available this month (carry forward
            + income − spending, transfers not counted as spending)
          </Text>
        </View>

        {/* ---------- ACTION: What needs my attention? ---------- */}
        <View className={card}>
          <Text className={cardTitle}>What needs my attention</Text>
          {!hasAttentionItems ? (
            <Text className="text-sm text-fg-muted">You&rsquo;re all caught up.</Text>
          ) : (
            <View className="gap-3">
              {overBudgetCategories.map((c) => (
                <AttentionRow
                  key={`budget-${c.id}`}
                  icon="shape-outline"
                  tone="danger"
                  text={`${c.name} is ${formatMoney(c.spentMinor - c.monthlyBudgetMinor!, baseCurrency)} over its ${formatMoney(c.monthlyBudgetMinor!, baseCurrency)}/mo budget`}
                  href="/categories"
                />
              ))}
              {upcomingCommitments.slice(0, 3).map((row) => (
                <AttentionRow
                  key={`commitment-${row.id}`}
                  icon="calendar-sync-outline"
                  tone="transfer"
                  text={`${row.label} due ${row.date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`}
                  href="/commitments"
                />
              ))}
              {behindPaceGoals.map(({ goal }) => (
                <AttentionRow
                  key={`goal-${goal.id}`}
                  icon="target"
                  tone="danger"
                  text={`${goal.name} is behind pace for its target date`}
                  href="/goal"
                />
              ))}
            </View>
          )}
        </View>

        {/* ---------- Shortcuts (no dedicated tab) ---------- */}
        <View className="flex-row flex-wrap gap-3">
          {SHORTCUTS.map((s) => (
            <Link key={s.href} href={s.href} asChild>
              <Pressable className="min-w-[30%] flex-1 items-center gap-2 rounded-card border border-glass-border bg-glass py-4">
                <Icon name={s.icon} size={20} color={colors.accent} />
                <Text className="text-xs font-medium text-fg">{s.label}</Text>
              </Pressable>
            </Link>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function AttentionRow({
  icon,
  tone,
  text,
  href,
}: {
  icon: string;
  tone: "danger" | "transfer";
  text: string;
  href: "/categories" | "/commitments" | "/goal";
}) {
  const colors = useThemeColors();
  const toneColor = tone === "danger" ? colors.danger : colors.transfer;
  return (
    <Link href={href} asChild>
      <Pressable className="flex-row items-center gap-2.5">
        <Icon name={icon} size={16} color={toneColor} />
        <Text className="flex-1 text-sm text-fg">{text}</Text>
        <Icon name="chevron-right" size={16} color={colors.fgSubtle} />
      </Pressable>
    </Link>
  );
}
