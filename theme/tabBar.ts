// Shared geometry for the bottom navigation bar (components/BottomNavBar.tsx)
// and the "+" docked into it.
export const NAV_BAR_HEIGHT = 64;
export const FAB_SIZE = 56;

// The bar is a normal docked element now, not the earlier `position:
// "absolute"` floating pill, so React Navigation already lays screens out
// above it and content no longer needs to clear the bar's own height. What
// content *does* still need to clear is the half of the "+" that overhangs
// the bar's top edge — hence half the button plus a small margin. Every
// scrollable tab screen (and the stack screens nested inside a tab, e.g.
// account detail / transactions calendar) applies this as bottom padding.
export const TAB_BAR_CLEARANCE = FAB_SIZE / 2 + 16;
