import type { goals as goalsTable } from "../db/schema";

type Goal = typeof goalsTable.$inferSelect;

export interface GoalProgress {
  goal: Goal;
  remaining: number;
  percent: number;
  reached: boolean;
  projectedDate: Date | null;
  isBehindTarget: boolean;
}

// Goals are net-worth targets (spec.md §5.17) — this is the one place that
// turns {netWorthNow, monthlyGrowth, goal} into progress/pace/behind-target,
// so app/goal/index.tsx and the Dashboard's "what needs attention" section
// (spec.md §5.19) share one calculation instead of two copies that could
// drift apart.
export function computeGoalProgress(
  goal: Goal,
  netWorthNow: number,
  monthlyGrowth: number,
  today: Date,
): GoalProgress {
  const target = goal.targetAmountMinor;
  const remaining = target - netWorthNow;
  const percent = Math.min(100, Math.max(0, (netWorthNow / target) * 100));
  const reached = netWorthNow >= target;

  let projectedDate: Date | null = null;
  if (!reached && monthlyGrowth > 0) {
    const monthsToGoal = Math.ceil(remaining / monthlyGrowth);
    projectedDate = new Date(today.getFullYear(), today.getMonth() + monthsToGoal, today.getDate());
  }
  const isBehindTarget = goal.targetDate !== null && projectedDate !== null && projectedDate > goal.targetDate;

  return { goal, remaining, percent, reached, projectedDate, isBehindTarget };
}
