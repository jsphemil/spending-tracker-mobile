import "../global.css";

import { useEffect } from "react";
import { Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Stack } from "expo-router";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";

import { db } from "../db/client";
import { ensureSeeded } from "../db/seed";
import migrations from "../drizzle/migrations";

export default function RootLayout() {
  const { success, error } = useMigrations(db, migrations);

  useEffect(() => {
    if (success) ensureSeeded(db);
  }, [success]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        {error ? (
          <View className="flex-1 items-center justify-center bg-white p-6">
            <Text className="text-center text-red-600">
              Database migration failed: {error.message}
            </Text>
          </View>
        ) : !success ? (
          <View className="flex-1 items-center justify-center bg-white">
            <Text>Setting up database…</Text>
          </View>
        ) : (
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="account/new"
              options={{ presentation: "modal", headerShown: true, title: "New Account" }}
            />
            <Stack.Screen
              name="account/[id]/edit"
              options={{ presentation: "modal", headerShown: true, title: "Edit Account" }}
            />
            <Stack.Screen
              name="transaction/new"
              options={{ presentation: "modal", headerShown: true, title: "New Transaction" }}
            />
            <Stack.Screen
              name="transaction/[id]/edit"
              options={{ presentation: "modal", headerShown: true, title: "Edit Transaction" }}
            />
            <Stack.Screen
              name="category/new"
              options={{ presentation: "modal", headerShown: true, title: "New Category" }}
            />
            <Stack.Screen
              name="category/[id]/edit"
              options={{ presentation: "modal", headerShown: true, title: "Edit Category" }}
            />
            <Stack.Screen
              name="tag/[name]"
              options={{ headerShown: true, title: "Tag" }}
            />
          </Stack>
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
