import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { eq } from "drizzle-orm";
import { router, useLocalSearchParams } from "expo-router";
import { Alert, Pressable, Text, View } from "react-native";

import { TransactionForm } from "../../../components/TransactionForm";
import { db } from "../../../db/client";
import { deleteTransaction, updateTransaction } from "../../../db/actions/transactions";
import { useTransactionTagIds } from "../../../db/queries/tags";
import { transactions } from "../../../db/schema";

export default function EditTransactionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const transactionId = Number(id);
  const { data } = useLiveQuery(
    db.select().from(transactions).where(eq(transactions.id, transactionId)),
  );
  const tagIds = useTransactionTagIds(transactionId);
  const transaction = data?.[0];

  if (!transaction) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <Text className="text-fg">Loading…</Text>
      </View>
    );
  }

  if (transaction.isOpeningBalance) {
    return (
      <View className="flex-1 items-center justify-center bg-bg p-6">
        <Text className="text-center text-fg-muted">
          This is the account's opening balance. Edit it from the account's
          settings instead.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <TransactionForm
        submitLabel="Save Changes"
        initialValues={{
          type: transaction.type,
          amountMinor: transaction.amountMinor,
          date: transaction.date,
          accountId: transaction.accountId,
          toAccountId: transaction.toAccountId,
          categoryId: transaction.categoryId,
          description: transaction.description ?? "",
          tagIds,
        }}
        onSubmit={(values) => {
          updateTransaction(transactionId, values);
          router.back();
        }}
      />
      <Pressable
        onPress={() =>
          Alert.alert("Delete transaction?", "This can't be undone.", [
            { text: "Cancel", style: "cancel" },
            {
              text: "Delete",
              style: "destructive",
              onPress: () => {
                deleteTransaction(transactionId);
                router.back();
              },
            },
          ])
        }
        className="mx-4 mb-6 items-center rounded-lg border border-danger/30 py-3"
      >
        <Text className="font-semibold text-danger">Delete Transaction</Text>
      </Pressable>
    </View>
  );
}
