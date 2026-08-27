import { Tabs } from "expo-router";

import { Icon } from "../../components/ui/Icon";
import { NAV_SHADOW } from "../../theme/gradients";
import { useThemeColors } from "../../theme/palette";

export default function TabsLayout() {
  const colors = useThemeColors();

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { color: colors.fg, fontFamily: "Manrope_700Bold" },
        headerTintColor: colors.fg,
        tabBarStyle: {
          position: "absolute",
          left: 16,
          right: 16,
          bottom: 16,
          height: 64,
          borderRadius: 9999,
          backgroundColor: "rgba(19, 26, 44, 0.86)",
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: colors.glassBorder,
          paddingTop: 8,
          ...NAV_SHADOW,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.fgSubtle,
        tabBarLabelStyle: { fontFamily: "Inter_500Medium", fontSize: 10 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => <Icon name="view-dashboard-outline" size={size} color={color} />,
        }}
      />
      {/* accounts/ and transactions/ are each their own Stack navigator
          (see their _layout.tsx) — that inner Stack owns the header so
          it can show a back button and a per-screen title ("Accounts"
          vs. "Account") when navigating into a detail screen. Showing
          this outer tab header too would just duplicate it. */}
      <Tabs.Screen
        name="accounts"
        options={{
          title: "Accounts",
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Icon name="wallet-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: "Transactions",
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Icon name="swap-horizontal" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="commitments"
        options={{
          title: "Commitments",
          tabBarIcon: ({ color, size }) => <Icon name="calendar-sync-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="categories"
        options={{
          title: "Categories",
          tabBarIcon: ({ color, size }) => <Icon name="shape-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <Icon name="account-circle-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
