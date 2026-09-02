import { Tabs } from "expo-router";

import { BottomNavBar } from "../../components/BottomNavBar";
import { Icon } from "../../components/ui/Icon";

// Exactly 4 destinations (spec.md §5.19 "Navigation V2"): Dashboard,
// Accounts, Transactions, Analytics. Commitments/Categories/Goals/Tags/
// Calendar/Settings moved out to top-level shortcut routes, reachable from
// the Dashboard's shortcut row and/or the global header — never duplicated
// here. Every tab hides its own header now; each screen renders the shared
// GlobalHeader itself.
//
// The bar itself is a custom component rather than React Navigation's
// default, because the "+" is docked into it (centred, straddling its top
// edge) instead of floating separately — see components/BottomNavBar.tsx.
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <BottomNavBar {...props} />}
      screenOptions={{ headerShown: false }}
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
