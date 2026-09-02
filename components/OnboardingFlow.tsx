import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CurrencyPicker } from "./CurrencyPicker";
import { Icon } from "./ui/Icon";
import { updateSettings } from "../db/actions/settings";
import type { settings as settingsTable } from "../db/schema";
import { Button } from "./ui/Button";

type Settings = typeof settingsTable.$inferSelect;

const STEP_COUNT = 4;

// V2 onboarding (spec.md §5.19 / master prompt §7) — completely replaces
// the old 4-step name+forced-account-creation flow. Never blocks on a name
// or an account: the user lands on an empty Dashboard and adds accounts
// later from Accounts. Gated by settings.onboardingCompleted exactly as
// before, so existing installs never see this at all (§5.13's skip
// mechanics are unchanged).
export function OnboardingFlow({ settings }: { settings: Settings }) {
  const [step, setStep] = useState(0);

  function finish() {
    updateSettings(settings.id, { onboardingCompleted: true });
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-bg">
      <View className="flex-row justify-center gap-1.5 pt-4 pb-2">
        {Array.from({ length: STEP_COUNT }).map((_, i) => (
          <View
            key={i}
            className={`h-1.5 w-8 rounded-full ${i <= step ? "bg-accent" : "bg-surface-3"}`}
          />
        ))}
      </View>

      {step === 0 && <WelcomeStep onNext={() => setStep(1)} />}
      {step === 1 && <FeaturesStep onNext={() => setStep(2)} />}
      {step === 2 && <HowToUseStep onNext={() => setStep(3)} />}
      {step === 3 && <BaseCurrencyStep settings={settings} onFinish={finish} />}
    </SafeAreaView>
  );
}

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <ScrollView contentContainerStyle={{ padding: 24, gap: 20, flexGrow: 1 }}>
      <Icon name="logo" size={32} color="#48e7f5" />
      <Text className="text-2xl font-display-xbold text-fg">Welcome to Erebor</Text>
      <Text className="text-base font-semibold text-fg">
        Take control of your money. Build your wealth.
      </Text>
      <Text className="text-base text-fg-muted">
        Erebor brings your accounts, spending, investments, goals and commitments into one clear
        picture — so you can make better decisions with your money.
      </Text>

      <View className="gap-4">
        <PrincipleRow
          title="Know your position"
          body="See your net worth, assets and debt at a glance."
        />
        <PrincipleRow
          title="Understand your money"
          body="Track income, spending and the movement of money between your accounts."
        />
        <PrincipleRow
          title="Build your wealth"
          body="Set goals, manage commitments and watch your financial position grow over time."
        />
      </View>

      <View className="flex-1" />
      <Button onPress={onNext}>Let&rsquo;s get started</Button>
    </ScrollView>
  );
}

function PrincipleRow({ title, body }: { title: string; body: string }) {
  return (
    <View className="gap-1">
      <Text className="text-base font-semibold text-fg">{title}</Text>
      <Text className="text-sm text-fg-muted">{body}</Text>
    </View>
  );
}

const FEATURE_CARDS = [
  { icon: "wallet-outline", title: "Accounts", body: "Keep your bank accounts, savings, investments, deposits, cash and credit cards organized in one place." },
  { icon: "swap-horizontal", title: "Transactions", body: "Record income, expenses and transfers as they happen." },
  { icon: "chart-line", title: "Wealth", body: "See your net worth and how your financial position changes over time." },
  { icon: "target", title: "Goals", body: "Turn financial intentions into measurable targets and track your progress." },
  { icon: "calendar-sync-outline", title: "Commitments", body: "Keep recurring expenses, income and investments visible so you know what's coming." },
  { icon: "shape-outline", title: "Analytics", body: "Understand your spending patterns, income, categories, assets and long-term trends." },
  { icon: "shield", title: "Backup & Restore", body: "Keep your financial data safe and restore it when you need it." },
] as const;

function FeaturesStep({ onNext }: { onNext: () => void }) {
  return (
    <ScrollView contentContainerStyle={{ padding: 24, gap: 20, flexGrow: 1 }}>
      <Text className="text-2xl font-display-xbold text-fg">
        Everything you need to master your money
      </Text>
      <Text className="text-base text-fg-muted">
        Erebor is designed to help you understand your finances as a whole — not just record
        expenses.
      </Text>

      <View className="gap-4">
        {FEATURE_CARDS.map((f) => (
          <View key={f.title} className="flex-row gap-3">
            <View className="h-9 w-9 items-center justify-center rounded-full bg-glass-fill-strong">
              <Icon name={f.icon} size={16} color="#48e7f5" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-fg">{f.title}</Text>
              <Text className="text-sm text-fg-muted">{f.body}</Text>
            </View>
          </View>
        ))}
      </View>

      <View className="flex-1" />
      <Button onPress={onNext}>Show me how</Button>
    </ScrollView>
  );
}

function HowToUseStep({ onNext }: { onNext: () => void }) {
  return (
    <ScrollView contentContainerStyle={{ padding: 24, gap: 20, flexGrow: 1 }}>
      <Text className="text-2xl font-display-xbold text-fg">A simple way to use Erebor</Text>
      <Text className="text-base text-fg-muted">
        You don&rsquo;t need to understand everything on day one. Start with these four habits.
      </Text>

      <HowToStep
        title="1. Add your accounts"
        body="Add the accounts and financial assets you want to track — such as bank accounts, investments, deposits, cash or credit cards. Your accounts form the foundation of your financial picture."
      />
      <HowToStep
        title="2. Record what happens"
        body="Record income when money comes in and expenses when you spend it."
      />
      <Callout
        title="Moving your own money isn't spending."
        body="Moving money from one account to another is a transfer, not an expense. For example, moving money from your everyday account to your savings or investment account doesn't reduce your overall wealth. Erebor keeps both sides of the transfer connected so your financial picture remains accurate."
      />
      <HowToStep
        title="3. Check your Dashboard"
        body="Your Dashboard answers three questions: Where do I stand? How am I doing this month? What needs my attention?"
      />
      <HowToStep
        title="4. Explore when you need more detail"
        body="Use Accounts for individual account information, Transactions for your financial activity, Calendar for a day-by-day view and Analytics for deeper insights."
      />
      <Callout
        title="Make it a habit"
        body="A few seconds spent recording an expense each day can give you a much clearer picture of your financial life."
      />

      <View className="flex-1" />
      <Button onPress={onNext}>Choose my currency</Button>
    </ScrollView>
  );
}

function HowToStep({ title, body }: { title: string; body: string }) {
  return (
    <View className="gap-1">
      <Text className="text-base font-semibold text-fg">{title}</Text>
      <Text className="text-sm text-fg-muted">{body}</Text>
    </View>
  );
}

function Callout({ title, body }: { title: string; body: string }) {
  return (
    <View className="gap-1 rounded-card border border-accent/30 bg-accent-soft p-4">
      <Text className="text-sm font-semibold text-accent">{title}</Text>
      <Text className="text-sm text-fg-muted">{body}</Text>
    </View>
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
