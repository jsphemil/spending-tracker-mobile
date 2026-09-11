import { ScrollView, Text, View } from "react-native";

import { Button } from "./ui/Button";
import { Icon } from "./ui/Icon";

// The three explanatory intro slides (spec.md §5.13 / §5.19 onboarding
// steps 1–3), shared by first-run onboarding (OnboardingFlow, which adds
// its currency step), the Settings "Replay the intro" route, and the
// header's ⓘ sheet — one copy of the words rather than three (§5.22).

export function WelcomeStep({ onNext, cta = "Let’s get started" }: { onNext: () => void; cta?: string }) {
  return (
    <ScrollView contentContainerStyle={{ padding: 24, gap: 20, flexGrow: 1 }}>
      <Icon name="logo" size={32} color="#48e7f5" />
      <Text className="text-2xl font-display-xbold text-fg">Welcome to Erebor</Text>
      <Text className="text-base font-semibold text-fg">
        Take control of your money. Build your wealth.
      </Text>
      <Text className="text-base text-fg-muted">
        Erebor brings your accounts, spending, investments, funds and commitments into one clear
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
          body="Earmark money for what's coming, manage commitments and watch your financial position grow over time."
        />
      </View>

      <View className="flex-1" />
      <Button onPress={onNext}>{cta}</Button>
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
  { icon: "piggy-bank", title: "Funds", body: "Set money aside for a laptop, a trip or next year's insurance — without moving it out of your accounts." },
  { icon: "calendar-sync-outline", title: "Commitments", body: "Keep recurring expenses, income and investments visible so you know what's coming." },
  { icon: "shape-outline", title: "Analytics", body: "Understand your spending patterns, income, categories, assets and long-term trends." },
  { icon: "shield", title: "Backup & Restore", body: "Keep your financial data safe and restore it when you need it." },
] as const;

export function FeaturesStep({ onNext }: { onNext: () => void }) {
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

// The four habits. HowToUseBody is the list on its own so the header's ⓘ
// sheet can show exactly this content without the slide's title and CTA.
export function HowToUseBody() {
  return (
    <>
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
    </>
  );
}

export function HowToUseStep({ onNext, cta = "Choose my currency" }: { onNext: () => void; cta?: string }) {
  return (
    <ScrollView contentContainerStyle={{ padding: 24, gap: 20, flexGrow: 1 }}>
      <Text className="text-2xl font-display-xbold text-fg">A simple way to use Erebor</Text>
      <Text className="text-base text-fg-muted">
        You don&rsquo;t need to understand everything on day one. Start with these four habits.
      </Text>

      <HowToUseBody />

      <View className="flex-1" />
      <Button onPress={onNext}>{cta}</Button>
    </ScrollView>
  );
}

export function HowToStep({ title, body }: { title: string; body: string }) {
  return (
    <View className="gap-1">
      <Text className="text-base font-semibold text-fg">{title}</Text>
      <Text className="text-sm text-fg-muted">{body}</Text>
    </View>
  );
}

export function Callout({ title, body }: { title: string; body: string }) {
  return (
    <View className="gap-1 rounded-card border border-accent/30 bg-accent-soft p-4">
      <Text className="text-sm font-semibold text-accent">{title}</Text>
      <Text className="text-sm text-fg-muted">{body}</Text>
    </View>
  );
}

// Step indicator shared by the two hosts of these slides.
export function StepDots({ count, current }: { count: number; current: number }) {
  return (
    <View className="flex-row justify-center gap-1.5 pt-4 pb-2">
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          className={`h-1.5 w-8 rounded-full ${i <= current ? "bg-accent" : "bg-surface-3"}`}
        />
      ))}
    </View>
  );
}
