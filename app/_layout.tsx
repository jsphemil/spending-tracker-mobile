import "../global.css";

import { useEffect } from "react";
import { Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Stack } from "expo-router";
import { vars } from "nativewind";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import { useFonts } from "expo-font";
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import { Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold } from "@expo-google-fonts/manrope";

import { OnboardingFlow } from "../components/OnboardingFlow";
import { db } from "../db/client";
import { useSettings } from "../db/queries/settings";
import { ensureSeeded } from "../db/seed";
import { runAutoBackupIfDue } from "../services/dropbox";
import { cssVars, useResolvedTheme, useThemeColors } from "../theme/palette";
import migrations from "../drizzle/migrations";

export default function RootLayout() {
  const { success, error } = useMigrations(db, migrations);
  const scheme = useResolvedTheme();
  const colors = useThemeColors();
  const { settings } = useSettings();
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  useEffect(() => {
    if (success) ensureSeeded(db);
  }, [success]);

  // "Automatic daily backup" (spec.md §3) — a true OS background task is
  // unreliable on mobile (opportunistic scheduling, no guaranteed daily
  // run, especially on iOS), so this app checks on every foreground
  // instead: if connected and no backup has run yet today, fire one off
  // silently. Fire-and-forget — never blocks render, never surfaces an
  // error the user didn't ask for (see runAutoBackupIfDue's own comment).
  useEffect(() => {
    if (settings?.dropboxAccountEmail) {
      runAutoBackupIfDue(settings.id, settings.lastAutoBackupDate);
    }
  }, [settings?.id, settings?.dropboxAccountEmail, settings?.lastAutoBackupDate]);

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
        ) : !success || !settings || !fontsLoaded ? (
          <View className="flex-1 items-center justify-center bg-bg">
            <Text className="text-fg">Setting up database…</Text>
          </View>
        ) : !settings.onboardingCompleted ? (
          <OnboardingFlow settings={settings} />
        ) : (
          <Stack
            screenOptions={{
              headerShown: false,
              headerStyle: { backgroundColor: colors.surface },
              headerTitleStyle: { color: colors.fg, fontFamily: "Manrope_700Bold" },
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
              name="goal/index"
              options={{ headerShown: true, title: "Goals" }}
            />
            <Stack.Screen
              name="goal/new"
              options={{ presentation: "modal", headerShown: true, title: "New Goal" }}
            />
            <Stack.Screen
              name="goal/[id]/edit"
              options={{ presentation: "modal", headerShown: true, title: "Edit Goal" }}
            />
            <Stack.Screen
              name="tag/index"
              options={{ headerShown: true, title: "Tags" }}
            />
            <Stack.Screen
              name="tag/[name]"
              options={{ headerShown: true, title: "Tag" }}
            />
            <Stack.Screen
              name="backup/restore"
              options={{ presentation: "modal", headerShown: true, title: "Restore Backup" }}
            />
          </Stack>
        )}
      </SafeAreaProvider>
      </View>
    </GestureHandlerRootView>
  );
}
