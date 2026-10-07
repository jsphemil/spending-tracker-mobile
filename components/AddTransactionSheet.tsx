import { Modal, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { Icon } from "./ui/Icon";
import type { TransactionType } from "../db/schema";
import { useThemeColors, type ThemeColors } from "../theme/palette";

const OPTIONS: { type: TransactionType; label: string; hint: string; icon: string; tone: keyof ThemeColors }[] = [
  { type: "expense", label: "Expense", hint: "Money you spent", icon: "trending-down", tone: "danger" },
  { type: "income", label: "Income", hint: "Money you received", icon: "trending-up", tone: "success" },
  { type: "transfer", label: "Transfer", hint: "Between your own accounts", icon: "swap-horizontal", tone: "transfer" },
];

// The "+" entry point (spec.md §5.24 "Shell"): choose the kind first, then
// land in the unchanged New Transaction form with that type preselected via
// its existing `?type=` param — no transaction logic lives here. Same
// bare-Modal bottom sheet as AccountSwitcherSheet; mounted only while open.
export function AddTransactionSheet({ onClose }: { onClose: () => void }) {
  const colors = useThemeColors();
  const router = useRouter();

  return (
    <Modal visible animationType="slide" onRequestClose={onClose} transparent>
      <Pressable className="flex-1 justify-end bg-black/50" onPress={onClose}>
        <Pressable className="rounded-t-3xl bg-surface" onPress={(e) => e.stopPropagation()}>
          <SafeAreaView edges={["bottom"]}>
            <View className="items-center pt-3">
              <View className="h-1 w-10 rounded-full bg-border-strong" />
            </View>
            <Text className="px-5 pb-2 pt-4 font-display text-lg text-fg">Add transaction</Text>
            <View className="pb-4">
              {OPTIONS.map((o) => (
                <Pressable
                  key={o.type}
                  onPress={() => {
                    onClose();
                    router.push(`/transaction/new?type=${o.type}`);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Add ${o.label.toLowerCase()}`}
                  className="min-h-16 flex-row items-center gap-4 px-5 py-3 active:bg-glass-press"
                >
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-surface-2">
                    <Icon name={o.icon} size={20} color={colors[o.tone]} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-medium text-fg">{o.label}</Text>
                    <Text className="text-sm text-fg-muted">{o.hint}</Text>
                  </View>
                  <Icon name="chevron-right" size={18} color={colors.fgSubtle} />
                </Pressable>
              ))}
            </View>
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
