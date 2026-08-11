import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Pressable, View } from "react-native";

import { useThemeColors } from "../../theme/palette";

export default function TabsLayout() {
  const colors = useThemeColors();

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: true,
          headerStyle: { backgroundColor: colors.surface },
          headerTitleStyle: { color: colors.fg },
          headerTintColor: colors.fg,
          tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.fgMuted,
        }}
      >
        <Tabs.Screen name="index" options={{ title: "Dashboard" }} />
        {/* accounts/ and transactions/ are each their own Stack navigator
            (see their _layout.tsx) — that inner Stack owns the header so
            it can show a back button and a per-screen title ("Accounts"
            vs. "Account") when navigating into a detail screen. Showing
            this outer tab header too would just duplicate it. */}
        <Tabs.Screen name="accounts" options={{ title: "Accounts", headerShown: false }} />
        <Tabs.Screen
          name="transactions"
          options={{ title: "Transactions", headerShown: false }}
        />
        <Tabs.Screen name="categories" options={{ title: "Categories" }} />
        <Tabs.Screen name="profile" options={{ title: "Profile" }} />
      </Tabs>
      {/* Placeholder for the Claude assistant entry point (spec.md §5.7) —
          deferred to a later phase; the slot stays visible per §5.9.
          Anchored bottom-LEFT deliberately: several tab screens (Accounts,
          Transactions, Categories) each render their own "+" FAB at
          bottom-right, and this placeholder used to sit at a bottom-right
          offset chosen relative to a different container than those FABs
          — it landed almost exactly on top of them once the tab bar's own
          height was factored in. Opposite corner sidesteps that entirely. */}
      <Pressable
        disabled
        accessibilityLabel="Ask (coming soon)"
        className="absolute bottom-24 left-5 h-14 w-14 items-center justify-center rounded-full opacity-60"
        style={{ backgroundColor: colors.surface3 }}
      >
        <MaterialCommunityIcons name="chat-outline" size={24} color={colors.fgMuted} />
      </Pressable>
    </View>
  );
}
