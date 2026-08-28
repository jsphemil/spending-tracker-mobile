import { Link } from "expo-router";
import { FlatList, Pressable, Text, View } from "react-native";

import { EmptyState } from "../../components/ui/EmptyState";
import { useTags } from "../../db/queries/tags";

export default function TagsListScreen() {
  const { data: tags } = useTags();

  return (
    <View className="flex-1 bg-bg">
      <FlatList
        data={tags ?? []}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        ListEmptyComponent={
          <EmptyState message="No tags yet. Add one from any transaction." />
        }
        renderItem={({ item }) => (
          <Link href={`/tag/${encodeURIComponent(item.name)}`} asChild>
            <Pressable className="flex-row items-center justify-between rounded-lg border border-glass-border bg-glass px-4 py-3">
              <Text className="text-base text-fg">{item.name}</Text>
            </Pressable>
          </Link>
        )}
      />
    </View>
  );
}
