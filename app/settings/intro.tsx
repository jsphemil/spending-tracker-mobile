import { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";

import { FeaturesStep, HowToUseStep, StepDots, WelcomeStep } from "../../components/IntroSteps";
import { updateSettings } from "../../db/actions/settings";
import { useSettings } from "../../db/queries/settings";

const STEP_COUNT = 3;

// "Replay the intro" (spec.md §5.22 "Walkthrough"): the three explanatory
// onboarding slides without the currency step. Finishing also clears
// hints_seen, so the first-visit hint cards come back on every screen —
// replaying the walkthrough means all of it, not just the slides.
export default function ReplayIntroScreen() {
  const router = useRouter();
  const { settings } = useSettings();
  const [step, setStep] = useState(0);

  function finish() {
    if (settings) updateSettings(settings.id, { hintsSeen: null });
    router.back();
  }

  return (
    <View className="flex-1 bg-bg">
      <StepDots count={STEP_COUNT} current={step} />
      {step === 0 && <WelcomeStep onNext={() => setStep(1)} cta="Continue" />}
      {step === 1 && <FeaturesStep onNext={() => setStep(2)} />}
      {step === 2 && <HowToUseStep onNext={finish} cta="Done" />}
    </View>
  );
}
