import { Tabs } from "expo-router";

import { Icon } from "../../components/ui/Icon";
import { NAV_SHADOW } from "../../theme/gradients";
import { useThemeColors } from "../../theme/palette";

// Exactly 4 destinations (spec.md §5.19 "Navigation V2"): Dashboard,
// Accounts, Transactions, Analytics. Commitments/Categories/Goals/Tags/
// Calendar/Settings moved out to top-level shortcut routes, reachable from
// the Dashboard's shortcut row and/or the global header — never duplicated
// here. Every tab hides its own header now; each screen renders the shared
// GlobalHeader itself.
export default function TabsLayout() {
  const colors = useThemeColors();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          left: 16,
          right: 16,
          bottom: 16,
          height: 78,
          borderRadius: 9999,
          backgroundColor: colors.glassFillStrong,
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: colors.glassBorder,
          paddingBottom: 10,
          paddingTop: 10,
          ...NAV_SHADOW,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.fgSubtle,
        tabBarLabelStyle: { fontFamily: "Inter_500Medium", fontSize: 10 },
        tabBarItemStyle: { paddingVertical: 0 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => <Icon name="view-dashboard-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="accounts"
        options={{
          title: "Accounts",
          tabBarIcon: ({ color, size }) => <Icon name="wallet-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: "Transactions",
          tabBarIcon: ({ color, size }) => <Icon name="swap-horizontal" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: "Analytics",
          tabBarIcon: ({ color, size }) => <Icon name="chart-line" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
