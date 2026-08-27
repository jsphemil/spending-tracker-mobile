import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AccountForm } from "./AccountForm";
import { CurrencyPicker } from "./CurrencyPicker";
import { createAccount } from "../db/actions/accounts";
import { updateSettings } from "../db/actions/settings";
import type { settings as settingsTable } from "../db/schema";
import { useThemeColors } from "../theme/palette";

type Settings = typeof settingsTable.$inferSelect;

const STEP_COUNT = 4;

const FEATURES = [
  { icon: "💰", title: "Multiple accounts", body: "Track bank accounts, credit cards, cash, and investments side by side." },
  { icon: "🔁", title: "Recurring transactions", body: "Set up a schedule once — salary, rent, subscriptions — and it keeps logging itself." },
  { icon: "🎯", title: "Goals & Commitments", body: "Track net-worth targets and see everything you're committed to spending each month." },
  { icon: "📤", title: "Export anytime", body: "Pull your transactions out as a CSV whenever you want, no lock-in." },
];

// Shown once before the main tabs are reachable at all, gated by
// settings.onboardingCompleted in app/_layout.tsx (spec.md §5.13). Rendered
// in place of the normal Stack, not as a routed screen, since step 3 needs
// AccountForm inline and this flow has no back-navigation to worry about.
export function OnboardingFlow({ settings }: { settings: Settings }) {
  const colors = useThemeColors();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");

  function finish() {
    updateSettings(settings.id, { onboardingCompleted: true });
  }

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-bg">
      <View className="flex-row justify-center gap-1.5 pt-4 pb-4">
        {Array.from({ length: STEP_COUNT }).map((_, i) => (
          <View
            key={i}
            className={`h-1.5 w-8 rounded-full ${i <= step ? "bg-accent" : "bg-surface-3"}`}
          />
        ))}
      </View>

      {step === 0 && (
        <ScrollView contentContainerStyle={{ padding: 24, gap: 20, flexGrow: 1 }}>
          <Text className="text-2xl font-bold text-fg">Welcome</Text>
          <Text className="text-base text-fg-muted">
            Let's get your ledger set up. First, pick the currency your figures should be
            summarized in — net worth, budgets, and any foreign-currency accounts will all
            convert against this one. You can change it anytime later from Profile.
          </Text>
          <CurrencyPicker
            label="Base Currency"
            value={settings.baseCurrency}
            onChange={(code) => updateSettings(settings.id, { baseCurrency: code })}
          />
          <View className="flex-1" />
          <Pressable onPress={() => setStep(1)} className="items-center rounded-lg bg-accent py-3">
            <Text className="font-semibold text-white">Continue</Text>
          </Pressable>
        </ScrollView>
      )}

      {step === 1 && (
        <ScrollView contentContainerStyle={{ padding: 24, gap: 20, flexGrow: 1 }}>
          <Text className="text-2xl font-bold text-fg">What should we call you?</Text>
          <Text className="text-base text-fg-muted">
            Optional — used only to personalize the app, never sent anywhere.
          </Text>
          <View className="gap-2">
            <Text className="text-sm font-medium text-fg-muted">Name (optional)</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={colors.fgSubtle}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-base text-fg"
            />
          </View>
          <View className="flex-1" />
          <Pressable
            onPress={() => {
              updateSettings(settings.id, { displayName: name.trim() || null });
              setStep(2);
            }}
            className="items-center rounded-lg bg-accent py-3"
          >
            <Text className="font-semibold text-white">Continue</Text>
          </Pressable>
        </ScrollView>
      )}

      {step === 2 && (
        <View className="flex-1">
          <View className="px-6 pb-2">
            <Text className="text-2xl font-bold text-fg">Add your first account</Text>
            <Text className="mt-2 text-base text-fg-muted">
              A bank account, credit card, cash wallet — whatever you want to start tracking.
              You can add more later.
            </Text>
          </View>
          <AccountForm
            mode="create"
            submitLabel="Add Account"
            onSubmit={(values) => {
              createAccount(values);
              setStep(3);
            }}
          />
        </View>
      )}

      {step === 3 && (
        <ScrollView contentContainerStyle={{ padding: 24, gap: 20, flexGrow: 1 }}>
          <Text className="text-2xl font-bold text-fg">You're all set</Text>
          <View className="gap-4">
            {FEATURES.map((f) => (
              <View key={f.title} className="flex-row gap-3">
                <Text className="text-2xl">{f.icon}</Text>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-fg">{f.title}</Text>
                  <Text className="text-sm text-fg-muted">{f.body}</Text>
                </View>
              </View>
            ))}
          </View>
          <View className="flex-1" />
          <Pressable onPress={finish} className="items-center rounded-lg bg-accent py-3">
            <Text className="font-semibold text-white">Get Started</Text>
          </Pressable>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
