import "../global.css";

import { useEffect } from "react";
import { Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Stack } from "expo-router";
import { vars } from "nativewind";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";

import { db } from "../db/client";
import { ensureSeeded } from "../db/seed";
import { cssVars, useResolvedTheme, useThemeColors } from "../theme/palette";
import migrations from "../drizzle/migrations";

export default function RootLayout() {
  const { success, error } = useMigrations(db, migrations);
  const scheme = useResolvedTheme();
  const colors = useThemeColors();

  useEffect(() => {
    if (success) ensureSeeded(db);
  }, [success]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* CSS variables driven directly from our own resolved theme state
          (settings.themePreference + OS scheme for "system"), not from
          NativeWind's colorScheme/Appearance.setColorScheme — that path is
          wired but never actually propagates on this Android build (see
          theme/palette.ts's cssVars comment for why). */}
      <View style={[{ flex: 1 }, vars(cssVars(scheme))]}>
      <SafeAreaProvider>
        <StatusBar style={scheme === "dark" ? "light" : "dark"} />
        {error ? (
          <View className="flex-1 items-center justify-center bg-bg p-6">
            <Text className="text-center text-danger">
              Database migration failed: {error.message}
            </Text>
          </View>
        ) : !success ? (
          <View className="flex-1 items-center justify-center bg-bg">
            <Text className="text-fg">Setting up database…</Text>
          </View>
        ) : (
          <Stack
            screenOptions={{
              headerShown: false,
              headerStyle: { backgroundColor: colors.surface },
              headerTitleStyle: { color: colors.fg },
              headerTintColor: colors.fg,
            }}
          >
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
      </View>
    </GestureHandlerRootView>
  );
}
