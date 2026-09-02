import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { Icon } from "./ui/Icon";
import { CurrencyPicker } from "./CurrencyPicker";
import { useSettings } from "../db/queries/settings";
import { updateSettings } from "../db/actions/settings";
import { useThemeColors } from "../theme/palette";

// Persistent compact top bar for every "normal" application screen —
// logo/name, base-currency selector, Calendar, an info/demo refresher, and
// Settings (spec.md §5.19 "Global app shell"). Mounted once per top-level
// screen (Dashboard, Accounts, Transactions, Analytics, and each Dashboard
// shortcut destination); Settings and its child screens render their own
// in-stack header instead — see each screen's own header comment.
export function GlobalHeader() {
  const { settings } = useSettings();
  const colors = useThemeColors();
  const [infoVisible, setInfoVisible] = useState(false);

  if (!settings) return null;

  return (
    <SafeAreaView edges={["top"]} className="bg-bg">
      <View className="flex-row items-center justify-between border-b border-glass-border px-4 py-2">
        <View className="flex-row items-center gap-2">
          <Icon name="logo" size={20} color={colors.accent} />
          <Text className="font-display text-base font-bold text-fg">Erebor</Text>
        </View>

        <View className="flex-row items-center gap-2">
          <CurrencyPicker
            compact
            value={settings.baseCurrency}
            onChange={(code) => updateSettings(settings.id, { baseCurrency: code })}
          />
          <Link href="/calendar" asChild>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Calendar"
              className="h-9 w-9 items-center justify-center rounded-full bg-glass"
            >
              <Icon name="calendar-month-outline" size={18} color={colors.fg} />
            </Pressable>
          </Link>
          <Pressable
            onPress={() => setInfoVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="About Erebor"
            className="h-9 w-9 items-center justify-center rounded-full bg-glass"
          >
            <Icon name="information-outline" size={18} color={colors.fg} />
          </Pressable>
          <Link href="/settings" asChild>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Settings"
              className="h-9 w-9 items-center justify-center rounded-full bg-glass"
            >
              <Icon name="settings-outline" size={18} color={colors.fg} />
            </Pressable>
          </Link>
        </View>
      </View>

      <InfoModal visible={infoVisible} onClose={() => setInfoVisible(false)} />
    </SafeAreaView>
  );
}

// Lets a returning user revisit onboarding's "how to use Erebor" habits
// without redoing the whole flow — the "info/demo icon" the master prompt
// asks for on the global header. Same copy as OnboardingFlow's step 3, not
// a second explanation written from scratch.
function InfoModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const colors = useThemeColors();
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <View className="flex-1 justify-end bg-black/50">
        <SafeAreaView edges={["bottom"]} className="max-h-[80%] rounded-t-3xl bg-bg">
          <View className="flex-row items-center justify-between border-b border-glass-border px-5 py-4">
            <Text className="font-display text-lg font-bold text-fg">A simple way to use Erebor</Text>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
              className="h-8 w-8 items-center justify-center rounded-full bg-glass"
            >
              <Icon name="close" size={16} color={colors.fg} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
            <Text className="text-sm text-fg-muted">
              You don't need to understand everything on day one. Start with these four habits.
            </Text>
            <InfoStep
              title="1. Add your accounts"
              body="Add the accounts and financial assets you want to track — such as bank accounts, investments, deposits, cash or credit cards. Your accounts form the foundation of your financial picture."
            />
            <InfoStep
              title="2. Record what happens"
              body="Record income when money comes in and expenses when you spend it. Moving money from one account to another is a transfer, not an expense — it doesn't reduce your overall wealth, and Erebor keeps both sides of the transfer connected so your financial picture stays accurate."
            />
            <InfoStep
              title="3. Check your Dashboard"
              body="Your Dashboard answers three questions: Where do I stand? How am I doing this month? What needs my attention?"
            />
            <InfoStep
              title="4. Explore when you need more detail"
              body="Use Accounts for individual account information, Transactions for your financial activity, Calendar for a day-by-day view and Analytics for deeper insights."
            />
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function InfoStep({ title, body }: { title: string; body: string }) {
  return (
    <View className="gap-1">
      <Text className="text-base font-semibold text-fg">{title}</Text>
      <Text className="text-sm text-fg-muted">{body}</Text>
    </View>
  );
}
