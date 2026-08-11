import { router, useLocalSearchParams } from "expo-router";

import { TransactionForm } from "../../components/TransactionForm";
import { createTransaction } from "../../db/actions/transactions";
import type { TransactionType } from "../../db/schema";
import { parseLocalDateString } from "../../services/period";

export default function NewTransactionScreen() {
  const params = useLocalSearchParams<{ accountId?: string; type?: string; date?: string }>();

  return (
    <TransactionForm
      submitLabel="Add Transaction"
      initialValues={{
        accountId: params.accountId ? Number(params.accountId) : undefined,
        type: (params.type as TransactionType) ?? "expense",
        date: params.date ? parseLocalDateString(params.date) : undefined,
      }}
      onSubmit={(values) => {
        createTransaction(values);
        router.back();
      }}
    />
  );
}
