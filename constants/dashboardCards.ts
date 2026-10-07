// Dashboard customisation (spec.md §5.22). The Dashboard's sections are
// rendered from a saved layout — order and hidden set — stored as JSON in
// settings.dashboard_layout and always read through parseDashboardLayout,
// which is where every invariant lives:
//   • netWorth is pinned first and can never be hidden — it is the
//     Dashboard's answer to "where do I stand", and it hosts the privacy
//     toggle.
//   • unknown ids are dropped, and any section missing from a saved order
//     is appended, so a section added in a later version shows up for users
//     with an older saved layout instead of silently vanishing.
//
// V4 (§5.24) retired the "shortcuts" tile card. Layouts saved before then
// may still carry a "shortcuts" id or a `shortcuts` key; both are ignored
// by the rules above, so no migration is needed.

export const CARD_IDS = ["netWorth", "month", "funds", "attention"] as const;
export type CardId = (typeof CARD_IDS)[number];

export const PINNED_CARD: CardId = "netWorth";

export const CARD_LABELS: Record<CardId, { label: string; description: string }> = {
  netWorth: { label: "Net worth", description: "Where you stand, and how it changed this month" },
  month: { label: "This month", description: "Income and spending, compared with last month" },
  funds: { label: "Funds", description: "Your top funds and their progress" },
  attention: { label: "Needs attention", description: "Commitments due, budgets exceeded, funds coming up" },
};

export interface DashboardLayout {
  order: CardId[];
  hidden: CardId[];
}

export const DEFAULT_LAYOUT: DashboardLayout = {
  order: [...CARD_IDS],
  hidden: [],
};

function isCardId(v: unknown): v is CardId {
  return typeof v === "string" && (CARD_IDS as readonly string[]).includes(v);
}

// Also used by the customise screen after every edit, so an in-memory
// layout can never violate the invariants either.
export function sanitizeDashboardLayout(input: Partial<DashboardLayout> | null | undefined): DashboardLayout {
  const seen = new Set<CardId>();
  const order: CardId[] = [];
  for (const id of input?.order ?? []) {
    if (isCardId(id) && !seen.has(id)) {
      seen.add(id);
      order.push(id);
    }
  }
  for (const id of CARD_IDS) {
    if (!seen.has(id)) order.push(id);
  }
  // Pinned card first, whatever was saved.
  const pinnedFirst: CardId[] = [PINNED_CARD, ...order.filter((id) => id !== PINNED_CARD)];

  const hidden = Array.from(
    new Set((input?.hidden ?? []).filter((id): id is CardId => isCardId(id) && id !== PINNED_CARD)),
  );

  return { order: pinnedFirst, hidden };
}

export function parseDashboardLayout(raw: string | null | undefined): DashboardLayout {
  if (!raw) return DEFAULT_LAYOUT;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return DEFAULT_LAYOUT;
    const obj = parsed as Record<string, unknown>;
    return sanitizeDashboardLayout({
      order: Array.isArray(obj.order) ? (obj.order as CardId[]) : undefined,
      hidden: Array.isArray(obj.hidden) ? (obj.hidden as CardId[]) : undefined,
    });
  } catch {
    return DEFAULT_LAYOUT;
  }
}

export function serializeDashboardLayout(layout: DashboardLayout): string {
  return JSON.stringify(sanitizeDashboardLayout(layout));
}

export function isDefaultLayout(layout: DashboardLayout): boolean {
  return serializeDashboardLayout(layout) === serializeDashboardLayout(DEFAULT_LAYOUT);
}
