import { Link, Stack, useLocalSearchParams } from "expo-router";
import { FlatList, Pressable, Text, View } from "react-native";

import { confirmDeleteTransaction } from "../../../components/confirmDeleteTransaction";
import { TransactionListItem } from "../../../components/TransactionListItem";
import { EmptyState } from "../../../components/ui/EmptyState";
import { Icon } from "../../../components/ui/Icon";
import { db } from "../../../db/client";
import { useAccounts } from "../../../db/queries/accounts";
import { useCategories } from "../../../db/queries/categories";
import { useSettings } from "../../../db/queries/settings";
import { useTagByName, useTagTransactions } from "../../../db/queries/tags";
import { useBaseConverter } from "../../../hooks/useBaseConverter";
import { formatMoney } from "../../../services/format";
import { useThemeColors } from "../../../theme/palette";

// Per-tag summary (spec.md §5.3a). Rows are the same TransactionListItem the
// Transactions tab and Account Detail use — one row layout everywhere
// (2026-09-15). This screen used to draw its own row, and with no
// description it showed the account name in the description's place.
export default function TagSummaryScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const tagName = decodeURIComponent(name);
  const { data: rows } = useTagTransactions(tagName);
  const { tag } = useTagByName(tagName);
  const colors = useThemeColors();
  const { settings } = useSettings();
  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();
  const baseCurrency = settings?.baseCurrency ?? "INR";

  const { toBaseMinor } = useBaseConverter((rows ?? []).map((r) => r.accountCurrency));

  const accountName = (id: number | null) => accounts?.find((a) => a.id === id)?.name;
  const categoryName = (id: number | null) => categories?.find((c) => c.id === id)?.name;

  const totals = (rows ?? []).reduce(
    (acc, { transaction, accountCurrency }) => {
      if (transaction.type === "transfer") return acc;
      const baseMinor = toBaseMinor(transaction.amountMinor, accountCurrency);
      if (transaction.type === "income") acc.incomeMinor += baseMinor;
      else acc.expenseMinor += baseMinor;
      return acc;
    },
    { incomeMinor: 0, expenseMinor: 0 },
  );
  const netMinor = totals.incomeMinor - totals.expenseMinor;

  return (
    <View className="flex-1 bg-bg">
      <Stack.Screen
        options={{
          title: tagName,
          headerRight: () =>
            tag ? (
              <Link href={`/tag/${encodeURIComponent(tagName)}/edit`} asChild>
                <Pressable hitSlop={8} className="px-2" accessibilityRole="button" accessibilityLabel="Edit tag">
                  <Icon name="pencil-outline" size={22} color={colors.accent} />
                </Pressable>
              </Link>
            ) : null,
        }}
      />
      <FlatList
        data={rows ?? []}
        keyExtractor={({ transaction }) => String(transaction.id)}
        contentContainerStyle={{ padding: 16 }}
        ListHeaderComponent={
          <View className="mb-6 gap-3">
            <View className="flex-row items-center gap-3">
              {tag && (
                <View style={{ backgroundColor: tag.color }} className="h-10 w-10 items-center justify-center rounded-full">
                  <Icon name={tag.icon} size={18} color="#fff" />
                </View>
              )}
              <Text className="flex-1 text-xl font-display text-fg">{tagName}</Text>
            </View>
            <Text className="text-base text-fg-muted">
              Net cost of {tagName}: {formatMoney(netMinor, baseCurrency)}
            </Text>
            <View className="flex-row justify-around">
              <View className="items-center">
                <Text className="text-xs text-fg-muted">Income</Text>
                <Text className="font-data text-base font-medium tabular-nums text-success">
                  {formatMoney(totals.incomeMinor, baseCurrency)}
                </Text>
              </View>
              <View className="items-center">
                <Text className="text-xs text-fg-muted">Expense</Text>
                <Text className="font-data text-base font-medium tabular-nums text-danger">
                  {formatMoney(totals.expenseMinor, baseCurrency)}
                </Text>
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={<EmptyState message="No transactions carry this tag yet." />}
        renderItem={({ item }) => (
          <TransactionListItem
            transaction={item.transaction}
            currency={item.accountCurrency}
            categoryName={categoryName(item.transaction.categoryId)}
            fromAccountName={
              item.transaction.type === "transfer" ? accountName(item.transaction.accountId) : undefined
            }
            toAccountName={
              item.transaction.type === "transfer" ? accountName(item.transaction.toAccountId) : undefined
            }
            accountName={item.accountName}
            hideTag={tagName}
            showActionIcons
            showDuplicateIcon
            onDelete={() => confirmDeleteTransaction(db, item.transaction, () => {})}
          />
        )}
      />
    </View>
  );
}
