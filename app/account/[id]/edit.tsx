import { router, useLocalSearchParams } from "expo-router";
import { Alert, Text, View } from "react-native";

import { AccountForm } from "../../../components/AccountForm";
import { updateAccount } from "../../../db/actions/accounts";
import { useAccount, useAccountOpeningBalance } from "../../../db/queries/accounts";

export default function EditAccountScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const accountId = Number(id);
  const { account } = useAccount(accountId);
  const openingBalanceTx = useAccountOpeningBalance(accountId);

  if (!account || !openingBalanceTx) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text>Loading…</Text>
      </View>
    );
  }

  const openingBalanceMinor =
    openingBalanceTx.type === "expense"
      ? -openingBalanceTx.amountMinor
      : openingBalanceTx.amountMinor;

  return (
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
        openingDate: openingBalanceTx.date,
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
  );
}
