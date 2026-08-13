import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { eq } from "drizzle-orm";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { confirmDeleteTransaction } from "../../../components/confirmDeleteTransaction";
import { TransactionForm } from "../../../components/TransactionForm";
import { db } from "../../../db/client";
import { updateTransaction } from "../../../db/actions/transactions";
import { useTransactionTagIds } from "../../../db/queries/tags";
import { recurringRules, transactions } from "../../../db/schema";
import { describeSchedule, editFutureOccurrences, editSingleOccurrence } from "../../../services/recurrence";

export default function EditTransactionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const transactionId = Number(id);
  const { data } = useLiveQuery(
    db.select().from(transactions).where(eq(transactions.id, transactionId)),
    [transactionId],
  );
  const tagIds = useTransactionTagIds(transactionId);
  const transaction = data?.[0];

  const { data: ruleRows } = useLiveQuery(
    db
      .select()
      .from(recurringRules)
      .where(eq(recurringRules.id, transaction?.recurringRuleId ?? -1)),
    [transaction?.recurringRuleId],
  );
  const rule = ruleRows?.[0];

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

  const isRecurring = transaction.recurringRuleId != null;
  if (isRecurring && !rule) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <Text className="text-fg">Loading…</Text>
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
        recurringInfo={
          rule ? { scheduleLabel: describeSchedule(rule.intervalCount, rule.intervalUnit), endDate: rule.endDate } : null
        }
        onSubmit={(values) => {
          updateTransaction(transactionId, values);
          router.back();
        }}
        onEditScope={(scope, values, newEndDate) => {
          if (scope === "one") {
            editSingleOccurrence(
              db,
              { id: transactionId, recurringRuleId: transaction.recurringRuleId!, occurrenceDate: transaction.occurrenceDate! },
              values,
            );
          } else {
            editFutureOccurrences(
              db,
              { id: transactionId, recurringRuleId: transaction.recurringRuleId!, occurrenceDate: transaction.occurrenceDate! },
              values,
              newEndDate,
            );
          }
          router.back();
        }}
      />
      <Pressable
        onPress={() => confirmDeleteTransaction(db, transaction, () => router.back())}
        className="mx-4 mb-6 items-center rounded-lg border border-danger/30 py-3"
      >
        <Text className="font-semibold text-danger">Delete Transaction</Text>
      </Pressable>
    </View>
  );
}
