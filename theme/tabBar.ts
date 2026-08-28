// The Erebor floating glass-pill tab bar (app/(tabs)/_layout.tsx) is
// `position: "absolute"`, so it overlays screen content instead of
// reserving layout space the way a normal docked tab bar does. Every
// scrollable tab screen (and the stack screens nested inside a tab, e.g.
// account detail / transactions calendar) needs bottom padding at least
// this large so its last item isn't hidden underneath the bar, and every
// floating "+" FAB needs to sit above it. Keep in sync with _layout.tsx's
// tabBarStyle bottom/height by hand — small, rarely-changing values.
const TAB_BAR_BOTTOM = 16;
const TAB_BAR_HEIGHT = 78;

export const TAB_BAR_CLEARANCE = TAB_BAR_BOTTOM + TAB_BAR_HEIGHT + 16;
export const FAB_BOTTOM_OFFSET = TAB_BAR_BOTTOM + TAB_BAR_HEIGHT + 14;
