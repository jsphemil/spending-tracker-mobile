import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CurrencyPicker } from "./CurrencyPicker";
import { Callout, FeaturesStep, HowToUseStep, StepDots, WelcomeStep } from "./IntroSteps";
import { updateSettings } from "../db/actions/settings";
import type { settings as settingsTable } from "../db/schema";
import { appVersionLabel } from "../services/feedbackLink";
import { Button } from "./ui/Button";

type Settings = typeof settingsTable.$inferSelect;

const STEP_COUNT = 4;

// V2 onboarding (spec.md §5.19 / master prompt §7) — completely replaces
// the old 4-step name+forced-account-creation flow. Never blocks on a name
// or an account: the user lands on an empty Dashboard and adds accounts
// later from Accounts. Gated by settings.onboardingCompleted exactly as
// before, so existing installs never see this at all (§5.13's skip
// mechanics are unchanged). The three explanatory slides live in
// IntroSteps.tsx so Settings → Replay the intro shows the same ones.
export function OnboardingFlow({ settings }: { settings: Settings }) {
  const [step, setStep] = useState(0);

  function finish() {
    // lastSeenVersion is written here so a fresh install never gets the
    // "What's new" sheet for the version it was installed with (§5.22).
    updateSettings(settings.id, {
      onboardingCompleted: true,
      lastSeenVersion: appVersionLabel().appVersion,
    });
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-bg">
      <StepDots count={STEP_COUNT} current={step} />

      {step === 0 && <WelcomeStep onNext={() => setStep(1)} />}
      {step === 1 && <FeaturesStep onNext={() => setStep(2)} />}
      {step === 2 && <HowToUseStep onNext={() => setStep(3)} />}
      {step === 3 && <BaseCurrencyStep settings={settings} onFinish={finish} />}
    </SafeAreaView>
  );
}

function BaseCurrencyStep({ settings, onFinish }: { settings: Settings; onFinish: () => void }) {
  return (
    <ScrollView contentContainerStyle={{ padding: 24, gap: 20, flexGrow: 1 }}>
      <Text className="text-2xl font-display-xbold text-fg">Choose your base currency</Text>
      <Text className="text-base text-fg-muted">
        This is the currency Erebor will use when showing your overall financial picture.
      </Text>

      <CurrencyPicker
        label="Base Currency"
        value={settings.baseCurrency}
        onChange={(code) => updateSettings(settings.id, { baseCurrency: code })}
      />

      <Callout
        title="Your accounts can use different currencies."
        body="Your base currency is used when Erebor summarizes your finances. If you have accounts in different currencies, Erebor converts them into your chosen base currency when calculating totals such as net worth and consolidated reports."
      />
      <Callout
        title="Your original amounts are always preserved."
        body="Changing your base currency does not change the currency of your accounts or the original amounts of your transactions."
      />
      <Callout
        title="You can change this later."
        body="Your base currency can be changed anytime from Settings."
      />

      <View className="flex-1" />
      <Button onPress={onFinish}>Enter Erebor</Button>
    </ScrollView>
  );
}
