import { Link } from "expo-router";
import { FlatList, Pressable, Text, View } from "react-native";

import { useAccounts } from "../../../db/queries/accounts";
import { useAccountBalances } from "../../../db/queries/balances";
import { ACCOUNT_TYPE_LABELS } from "../../../constants/accountTypes";
import { formatMoney } from "../../../services/format";

export default function AccountsListScreen() {
  const { data: accounts } = useAccounts();
  const balances = useAccountBalances();

  return (
    <View className="flex-1 bg-white">
      <FlatList
        data={accounts ?? []}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        ListEmptyComponent={
          <View className="items-center justify-center py-16">
            <Text className="text-gray-500">No accounts yet.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Link href={`/accounts/${item.id}`} asChild>
            <Pressable className="flex-row items-center justify-between rounded-xl border border-gray-200 p-4">
              <View className="flex-row items-center gap-3">
                <View
                  style={{ backgroundColor: item.color }}
                  className="h-10 w-10 rounded-full"
                />
                <View>
                  <Text className="text-base font-medium text-gray-900">
                    {item.name}
                  </Text>
                  <Text className="text-sm text-gray-500">
                    {ACCOUNT_TYPE_LABELS[item.type]}
                  </Text>
                </View>
              </View>
              <Text className="text-base font-semibold text-gray-900">
                {formatMoney(balances[item.id] ?? 0, item.currency)}
              </Text>
            </Pressable>
          </Link>
        )}
      />
      <Link href="/account/new" asChild>
        <Pressable className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-blue-600">
          <Text className="text-2xl text-white">+</Text>
        </Pressable>
      </Link>
    </View>
  );
}
