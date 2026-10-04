import type { ReactNode } from "react";
import { ScrollView, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ScreenScrollViewProps {
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

// The scroll container for plain screens pushed outside the tabs — Settings
// and its pages, Backup, About. They have no bottom bar of their own, and
// the app runs edge-to-edge, so Android paints the navigation bar over the
// window: with 3-button navigation (~48dp, against gesture navigation's
// ~16dp) the last row of a scrolled screen ends up underneath it. Reported
// on New Transaction 2026-10-04; the same gap existed on every one of these
// screens, which is why the inset lives here rather than in each file.
//
// Tab screens don't use this — components/BottomNavBar.tsx applies the inset
// itself and screens clear it via TAB_BAR_CLEARANCE. Forms use
// FormScrollView, which does the same thing on top of keyboard handling.
export function ScreenScrollView({ children, contentContainerStyle }: ScreenScrollViewProps) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      className="flex-1 bg-bg"
      // Last, so paddingBottom wins over the callers' `padding` shorthand.
      contentContainerStyle={[contentContainerStyle, { paddingBottom: insets.bottom + 16 }]}
    >
      {children}
    </ScrollView>
  );
}
