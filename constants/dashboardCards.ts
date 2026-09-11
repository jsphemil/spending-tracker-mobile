// Dashboard customisation (spec.md §5.22). The Dashboard's cards are
// rendered from a saved layout — order, hidden set, and which shortcut
// tiles appear — stored as JSON in settings.dashboard_layout and always
// read through parseDashboardLayout, which is where every invariant lives:
//   • netWorth is pinned first and can never be hidden — it is the
//     Dashboard's answer to "where do I stand", and it hosts the privacy
//     toggle and the Earmarked/Unallocated figures.
//   • unknown ids are dropped, and any card missing from a saved order is
//     appended, so a card added in a later version shows up for users
//     with an older saved layout instead of silently vanishing.

export const CARD_IDS = ["netWorth", "funds", "month", "attention", "shortcuts"] as const;
export type CardId = (typeof CARD_IDS)[number];

export const PINNED_CARD: CardId = "netWorth";

export const CARD_LABELS: Record<CardId, { label: string; description: string }> = {
  netWorth: { label: "Net worth", description: "Where do I stand — assets, debt, earmarked, unallocated" },
  funds: { label: "Funds", description: "Your top three funds and their progress" },
  month: { label: "This month", description: "How am I doing — income, spending, what's left" },
  attention: { label: "What needs my attention", description: "Over-budget categories, commitments due, funds coming up" },
  shortcuts: { label: "Shortcuts", description: "Tiles for the screens without a tab of their own" },
};

// Mirrors the Dashboard's SHORTCUTS hrefs. Kept as plain strings here so
// the layout can be parsed without importing expo-router.
export const SHORTCUT_HREFS = ["/commitments", "/categories", "/fund", "/tag", "/calendar", "/settings"] as const;
export type ShortcutHref = (typeof SHORTCUT_HREFS)[number];

export interface DashboardLayout {
  order: CardId[];
  hidden: CardId[];
  shortcuts: ShortcutHref[];
}

export const DEFAULT_LAYOUT: DashboardLayout = {
  order: [...CARD_IDS],
  hidden: [],
  shortcuts: [...SHORTCUT_HREFS],
};

function isCardId(v: unknown): v is CardId {
  return typeof v === "string" && (CARD_IDS as readonly string[]).includes(v);
}

function isShortcutHref(v: unknown): v is ShortcutHref {
  return typeof v === "string" && (SHORTCUT_HREFS as readonly string[]).includes(v);
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

  const shortcuts = Array.from(new Set((input?.shortcuts ?? []).filter(isShortcutHref)));

  return { order: pinnedFirst, hidden, shortcuts };
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
      // A missing `shortcuts` key means "all", not "none" — the shape
      // predates no version, but a hand-edited or partial value shouldn't
      // strip every tile.
      shortcuts: Array.isArray(obj.shortcuts) ? (obj.shortcuts as ShortcutHref[]) : DEFAULT_LAYOUT.shortcuts,
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
