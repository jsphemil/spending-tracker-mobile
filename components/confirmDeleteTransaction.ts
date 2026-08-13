import { Alert } from "react-native";

import type { Db } from "../db/client";
import { deleteTransaction } from "../db/actions/transactions";
import { deleteFutureOccurrences, deleteSingleOccurrence } from "../services/recurrence";

interface DeletableTransaction {
  id: number;
  recurringRuleId: number | null;
  occurrenceDate: Date | null;
}

// Shared between every screen that renders a delete action on a
// transaction row (Dashboard, Account Detail, Transactions list, the
// dedicated edit screen) — a recurring row needs the "just this one / this
// and all future" scope choice instead of a plain confirm, and this keeps
// that branch in one place rather than duplicated per screen.
export function confirmDeleteTransaction(
  db: Db,
  transaction: DeletableTransaction,
  onDeleted: () => void,
): void {
  if (transaction.recurringRuleId != null && transaction.occurrenceDate != null) {
    Alert.alert("Delete recurring transaction", undefined, [
      {
        text: "Just this one",
        onPress: () => {
          deleteSingleOccurrence(db, transaction.id);
          onDeleted();
        },
      },
      {
        text: "This and all future occurrences",
        style: "destructive",
        onPress: () => {
          deleteFutureOccurrences(db, {
            id: transaction.id,
            recurringRuleId: transaction.recurringRuleId!,
            occurrenceDate: transaction.occurrenceDate!,
          });
          onDeleted();
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
    return;
  }

  Alert.alert("Delete transaction?", "This can't be undone.", [
    { text: "Cancel", style: "cancel" },
    {
      text: "Delete",
      style: "destructive",
      onPress: () => {
        deleteTransaction(transaction.id);
        onDeleted();
      },
    },
  ]);
}
