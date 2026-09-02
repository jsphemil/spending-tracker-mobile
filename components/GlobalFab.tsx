import { Pressable } from "react-native";
import { Link } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import { Icon } from "./ui/Icon";
import { GRADIENTS } from "../theme/gradients";
import { GLOW_SHADOWS } from "../theme/gradients";
import { FAB_BOTTOM_OFFSET } from "../theme/tabBar";

interface GlobalFabProps {
  // Screens under the floating pill tab bar need extra bottom clearance to
  // sit above it; shortcut destinations outside the tab bar (Commitments,
  // Categories, Goals, Tags, Calendar) just need the safe-area inset plus a
  // small margin. Never rendered on Settings/Settings child screens
  // (spec.md §5.19 "Global app shell").
  insideTabs?: boolean;
}

// Persistent "+" for adding a transaction, present on every normal
// application screen. Always opens the existing transaction creation flow
// (app/transaction/new.tsx) — no second transaction-entry system, no
// per-screen variants for "new account"/"new category" (those move to a
// small header action on their own list screens instead).
export function GlobalFab({ insideTabs = false }: GlobalFabProps) {
  const insets = useSafeAreaInsets();
  const bottom = insideTabs ? FAB_BOTTOM_OFFSET : insets.bottom + 20;

  return (
    <Link href="/transaction/new" asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add transaction"
        className="absolute right-6 h-14 w-14 items-center justify-center rounded-full"
        style={{ bottom, ...GLOW_SHADOWS.brand }}
      >
        <LinearGradient
          colors={GRADIENTS.brand}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ height: 56, width: 56, borderRadius: 9999, alignItems: "center", justifyContent: "center" }}
        >
          <Icon name="plus" size={26} color="#ffffff" strokeWidth={2.5} />
        </LinearGradient>
      </Pressable>
    </Link>
  );
}
