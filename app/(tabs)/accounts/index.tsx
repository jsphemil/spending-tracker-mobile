import { Link } from "expo-router";
import { FlatList, Pressable, Text, View } from "react-native";

import { useAccounts } from "../../../db/queries/accounts";
import { useAccountBalances } from "../../../db/queries/balances";
import { ACCOUNT_TYPE_LABELS } from "../../../constants/accountTypes";
import { formatMoney } from "../../../services/format";
import { EmptyState } from "../../../components/ui/EmptyState";

export default function AccountsListScreen() {
  const { data: accounts } = useAccounts();
  const balances = useAccountBalances();

  return (
    <View className="flex-1 bg-bg">
      <FlatList
        data={accounts ?? []}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        ListEmptyComponent={<EmptyState message="No accounts yet." />}
        renderItem={({ item }) => (
          <Link href={`/accounts/${item.id}`} asChild>
            <Pressable className="flex-row items-center justify-between rounded-xl border border-border bg-surface p-4">
              <View className="flex-row items-center gap-3">
                <View
                  style={{ backgroundColor: item.color }}
                  className="h-10 w-10 rounded-full"
                />
                <View>
                  <Text className="text-base font-medium text-fg">
                    {item.name}
                  </Text>
                  <Text className="text-sm text-fg-muted">
                    {ACCOUNT_TYPE_LABELS[item.type]}
                  </Text>
                </View>
              </View>
              <Text className="font-data text-base font-semibold tabular-nums text-fg">
                {formatMoney(balances[item.id] ?? 0, item.currency)}
              </Text>
            </Pressable>
          </Link>
        )}
      />
      <Link href="/account/new" asChild>
        <Pressable className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-accent">
          <Text className="text-2xl text-white">+</Text>
        </Pressable>
      </Link>
    </View>
  );
}
