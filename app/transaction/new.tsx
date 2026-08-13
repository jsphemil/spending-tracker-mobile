import { eq } from "drizzle-orm";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { router, useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";

import { TransactionForm } from "../../components/TransactionForm";
import { db } from "../../db/client";
import { createTransaction } from "../../db/actions/transactions";
import { useTransactionTagIds } from "../../db/queries/tags";
import { transactions, type TransactionType } from "../../db/schema";
import { parseLocalDateString } from "../../services/period";
import { createRecurringSeries } from "../../services/recurrence";

export default function NewTransactionScreen() {
  const params = useLocalSearchParams<{
    accountId?: string;
    type?: string;
    date?: string;
    duplicateId?: string;
  }>();

  const duplicateId = params.duplicateId ? Number(params.duplicateId) : null;
  const { data: duplicateRows } = useLiveQuery(
    db.select().from(transactions).where(eq(transactions.id, duplicateId ?? -1)),
    [duplicateId],
  );
  // Opening-balance rows are excluded, same as their edit/delete guards —
  // duplicating one wouldn't make sense outside the account-edit flow.
  const duplicateSource = duplicateRows?.find((t) => !t.isOpeningBalance);
  const duplicateTagIds = useTransactionTagIds(duplicateSource?.id ?? -1);

  // Still loading the source row — avoid rendering the form with stale
  // "new" defaults for a moment before the duplicate data arrives.
  if (duplicateId && duplicateRows === undefined) return null;

  return (
    <View className="flex-1">
      {duplicateSource && (
        <Text className="px-4 pt-4 text-sm text-fg-muted">
          Duplicated from a previous transaction — dated today.
        </Text>
      )}
      <TransactionForm
        submitLabel="Add Transaction"
        allowRecurring
        initialValues={
          duplicateSource
            ? {
                type: duplicateSource.type,
                amountMinor: duplicateSource.amountMinor,
                date: new Date(),
                accountId: duplicateSource.accountId,
                toAccountId: duplicateSource.toAccountId,
                categoryId: duplicateSource.categoryId,
                description: duplicateSource.description ?? "",
                tagIds: duplicateTagIds,
              }
            : {
                accountId: params.accountId ? Number(params.accountId) : undefined,
                type: (params.type as TransactionType) ?? "expense",
                date: params.date ? parseLocalDateString(params.date) : undefined,
              }
        }
        onSubmit={(values) => {
          createTransaction(values);
          router.back();
        }}
        onSubmitRecurring={(values, schedule) => {
          createRecurringSeries(db, values, schedule);
          router.back();
        }}
      />
    </View>
  );
}
