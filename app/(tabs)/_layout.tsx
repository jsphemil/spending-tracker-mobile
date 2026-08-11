import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Pressable, View } from "react-native";

export default function TabsLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Tabs screenOptions={{ headerShown: true }}>
        <Tabs.Screen name="index" options={{ title: "Dashboard" }} />
        <Tabs.Screen name="accounts" options={{ title: "Accounts" }} />
        <Tabs.Screen name="transactions" options={{ title: "Transactions" }} />
        <Tabs.Screen name="categories" options={{ title: "Categories" }} />
        <Tabs.Screen name="profile" options={{ title: "Profile" }} />
      </Tabs>
      {/* Placeholder for the Claude assistant entry point (spec.md §5.7) —
          deferred to a later phase; the slot stays visible per §5.9. */}
      <Pressable
        disabled
        accessibilityLabel="Ask (coming soon)"
        className="absolute bottom-24 right-5 h-14 w-14 items-center justify-center rounded-full bg-gray-300 opacity-60"
      >
        <MaterialCommunityIcons name="chat-outline" size={24} color="#6B7280" />
      </Pressable>
    </View>
  );
}
