// First-visit hints (spec.md §5.22 "Walkthrough"). One dismissible card at
// the top of each main screen the first time it is opened — the on-screen
// half of the walkthrough the testers asked for, alongside the replayable
// intro. Dismissals are stored as a JSON array of ids in
// settings.hints_seen; "Replay the intro" clears it, so replay means the
// whole walkthrough and not just the slides.

export const HINT_IDS = [
  "dashboard",
  "accounts",
  "transactions",
  "analytics",
  "funds",
  "commitments",
  "categories",
] as const;

export type HintId = (typeof HINT_IDS)[number];

export const HINTS: Record<HintId, { title: string; body: string }> = {
  dashboard: {
    title: "Your Dashboard answers three questions",
    body: "Where do I stand, how is this month going, and what needs my attention. Tap the eye to reveal your net worth for this session, and the ⓘ in the header any time for the basics.",
  },
  accounts: {
    title: "Accounts are the foundation",
    body: "Add every place your money lives — bank, cash, cards, deposits, investments. Each shows its balance as of the end of the month you're viewing, with this month's income and spending beside it.",
  },
  transactions: {
    title: "Moving your own money isn't spending",
    body: "Record income when money comes in and expenses when you spend. Money moved between your own accounts is a Transfer — it never counts as spending.",
  },
  analytics: {
    title: "The longer view",
    body: "Net worth over time, how your assets are split, and this month's spending by category. Page back through the months with the arrows.",
  },
  funds: {
    title: "Earmark, don't move",
    body: "A Fund sets money aside for something specific without moving it between accounts. Your net worth doesn't change — the Dashboard just shows how much is spoken for.",
  },
  commitments: {
    title: "What's already committed",
    body: "Every recurring rule, normalised to a monthly amount, so you can see how much of each month is spoken for before it starts.",
  },
  categories: {
    title: "Give a category a budget",
    body: "Set a monthly budget on any expense category and its bar shows spend against it. Go over and the Dashboard will tell you.",
  },
};

// Defensive read of settings.hints_seen: null, garbage and unknown ids all
// collapse to "nothing seen" rather than throwing at render.
export function parseHintsSeen(raw: string | null | undefined): HintId[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is HintId => (HINT_IDS as readonly string[]).includes(v as string));
  } catch {
    return [];
  }
}

export function serializeHintsSeen(ids: HintId[]): string {
  return JSON.stringify(Array.from(new Set(ids)));
}
