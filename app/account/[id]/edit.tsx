import { router, useLocalSearchParams } from "expo-router";
import { Alert, Pressable, Text, View } from "react-native";

import { AccountForm } from "../../../components/AccountForm";
import { deleteAccount, updateAccount } from "../../../db/actions/accounts";
import { useAccount, useAccountOpeningBalance } from "../../../db/queries/accounts";

export default function EditAccountScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const accountId = Number(id);
  const { account } = useAccount(accountId);
  const { openingBalanceTx, isLoading: openingBalanceLoading } = useAccountOpeningBalance(accountId);

  if (!account || openingBalanceLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <Text className="text-fg">Loading…</Text>
      </View>
    );
  }

  // No row means the opening balance is 0 (db/actions/accounts.ts skips
  // creating a row for the zero case) — falls back to the account's own
  // creation date, since there's no other natural "opening date" to show.
  const openingBalanceMinor = openingBalanceTx
    ? openingBalanceTx.type === "expense"
      ? -openingBalanceTx.amountMinor
      : openingBalanceTx.amountMinor
    : 0;
  const openingDate = openingBalanceTx?.date ?? account.createdAt;

  return (
    <View className="flex-1">
      <AccountForm
        mode="edit"
        submitLabel="Save Changes"
        initialValues={{
          name: account.name,
          type: account.type,
          color: account.color,
          currency: account.currency,
          creditLimitMinor: account.creditLimitMinor,
          openingBalanceMinor,
          openingDate,
          budgetModeEnabled: account.budgetModeEnabled,
          showFutureTxEnabled: account.showFutureTxEnabled,
          budgetMonthlyMinor: account.budgetMonthlyMinor,
        }}
        onSubmit={(values) => {
          try {
            updateAccount(accountId, values);
            router.back();
          } catch (e) {
            Alert.alert("Couldn't save account", String(e));
          }
        }}
      />
      <Pressable
        onPress={() =>
          Alert.alert(
            "Delete account?",
            `This can't be undone. "${account.name}" and its opening balance will be removed.`,
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Delete",
                style: "destructive",
                onPress: () => {
                  try {
                    deleteAccount(accountId);
                    // Not router.back(): that would return to this account's
                    // own (now-deleted) Detail screen, whichever screen this
                    // modal was opened from — dismissTo instead drops every
                    // screen on top and lands on the Accounts list directly,
                    // the only place that's still valid after a delete.
                    router.dismissTo("/accounts");
                  } catch (e) {
                    Alert.alert(
                      "Couldn't delete account",
                      e instanceof Error ? e.message : String(e),
                    );
                  }
                },
              },
            ],
          )
        }
        className="mx-4 mb-6 items-center rounded-lg border border-danger/30 py-3"
      >
        <Text className="font-semibold text-danger">Delete Account</Text>
      </Pressable>
    </View>
  );
}
