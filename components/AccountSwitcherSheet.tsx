import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CurrencyAmount } from "./CurrencyAmount";
import { Icon } from "./ui/Icon";
import { ACCOUNT_TYPE_LABELS } from "../constants/accountTypes";
import { db } from "../db/client";
import type { accounts as accountsTable } from "../db/schema";
import { getAccountBalanceMinor } from "../services/balance";
import { useThemeColors } from "../theme/palette";

type Account = typeof accountsTable.$inferSelect;

interface AccountSwitcherSheetProps {
  /** Every account, in the Accounts list's own order. */
  accounts: Account[];
  currentId: number;
  /** End of the month being viewed — balances shown as of this cutoff. */
  asOfDate: Date;
  onSelect: (id: number) => void;
  onClose: () => void;
}

// Account Detail's "tap the name to switch" chooser (spec.md §5.1,
// 2026-09-15) — the same bottom-sheet-shaped bare Modal as CurrencyPicker
// and the fund allocation sheet, and the same interaction the home-screen
// widget's picker has. Rows mirror the Accounts list's rows so the
// chooser reads as that list folded into a sheet. Mounted only while
// open, so nothing needs resetting between opens.
export function AccountSwitcherSheet({ accounts, currentId, asOfDate, onSelect, onClose }: AccountSwitcherSheetProps) {
  const colors = useThemeColors();

  return (
    <Modal visible animationType="slide" onRequestClose={onClose} transparent>
      <Pressable className="flex-1 justify-end bg-black/50" onPress={onClose}>
        <Pressable className="max-h-[70%] rounded-t-3xl bg-bg" onPress={(e) => e.stopPropagation()}>
          <SafeAreaView edges={["bottom"]}>
            <View className="flex-row items-center justify-between border-b border-glass-border px-5 py-4">
              <Text className="font-display text-lg font-bold text-fg">Switch account</Text>
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Close"
                className="h-8 w-8 items-center justify-center rounded-full bg-glass"
              >
                <Icon name="close" size={16} color={colors.fg} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
              {accounts.map((account) => {
                const current = account.id === currentId;
                // Explicit cutoff — getAccountBalanceMinor with no asOfDate
                // sums the whole ledger, future rows included.
                const balanceMinor = getAccountBalanceMinor(db, account.id, asOfDate);
                return (
                  <Pressable
                    key={account.id}
                    onPress={() => onSelect(account.id)}
                    disabled={current}
                    accessibilityRole="button"
                    accessibilityState={{ selected: current }}
                    accessibilityLabel={account.name}
                    className={`flex-row items-center justify-between rounded-card border p-3 ${
                      current ? "border-accent bg-accent-soft" : "border-glass-border bg-glass"
                    }`}
                  >
                    <View className="flex-1 flex-row items-center gap-3 pr-3">
                      <View
                        style={{ backgroundColor: account.color }}
                        className="h-9 w-9 items-center justify-center rounded-full"
                      >
                        <Icon name={account.icon} size={16} color="#fff" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-base font-medium text-fg" numberOfLines={1}>
                          {account.name}
                        </Text>
                        <Text className="text-xs text-fg-muted">{ACCOUNT_TYPE_LABELS[account.type]}</Text>
                      </View>
                    </View>
                    <CurrencyAmount
                      amountMinor={balanceMinor}
                      currency={account.currency}
                      className="text-sm font-semibold text-fg"
                    />
                  </Pressable>
                );
              })}
            </ScrollView>
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
