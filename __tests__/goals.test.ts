import { computeGoalProgress } from "../services/goals";

const today = new Date(2026, 8, 2);

function makeGoal(overrides: Partial<{ id: number; name: string; targetAmountMinor: number; targetDate: Date | null }> = {}) {
  return {
    id: overrides.id ?? 1,
    name: overrides.name ?? "Test Goal",
    targetAmountMinor: overrides.targetAmountMinor ?? 1000000,
    targetDate: overrides.targetDate ?? null,
    createdAt: today,
  };
}

describe("computeGoalProgress", () => {
  it("marks a goal reached once net worth meets the target", () => {
    const progress = computeGoalProgress(makeGoal({ targetAmountMinor: 500000 }), 600000, 10000, today);
    expect(progress.reached).toBe(true);
    expect(progress.percent).toBe(100);
    expect(progress.projectedDate).toBeNull();
  });

  it("projects a completion date from monthly growth when not yet reached", () => {
    const progress = computeGoalProgress(makeGoal({ targetAmountMinor: 1000000 }), 400000, 100000, today);
    expect(progress.reached).toBe(false);
    expect(progress.remaining).toBe(600000);
    expect(progress.projectedDate).not.toBeNull();
    expect(progress.projectedDate!.getMonth()).toBe((today.getMonth() + 6) % 12);
  });

  it("has no projected date when not currently trending toward the goal", () => {
    const progress = computeGoalProgress(makeGoal(), 100000, 0, today);
    expect(progress.projectedDate).toBeNull();
    expect(progress.isBehindTarget).toBe(false);
  });

  it("flags behind-target when the projected date is after the goal's target date", () => {
    const nearTargetDate = new Date(2026, 9, 1); // one month out
    const progress = computeGoalProgress(
      makeGoal({ targetAmountMinor: 1000000, targetDate: nearTargetDate }),
      100000,
      10000, // slow growth -> projected date far beyond nearTargetDate
      today,
    );
    expect(progress.isBehindTarget).toBe(true);
  });

  it("is not behind target when the projected date is before the goal's target date", () => {
    const farTargetDate = new Date(2030, 0, 1);
    const progress = computeGoalProgress(
      makeGoal({ targetAmountMinor: 500000, targetDate: farTargetDate }),
      400000,
      100000,
      today,
    );
    expect(progress.isBehindTarget).toBe(false);
  });
});
