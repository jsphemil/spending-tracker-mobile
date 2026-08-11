import { useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { FlatList, Pressable, Text, View } from "react-native";

import { useCategories } from "../../db/queries/categories";
import type { CategoryKind } from "../../db/schema";
import { EmptyState } from "../../components/ui/EmptyState";

export default function CategoriesScreen() {
  const [kind, setKind] = useState<CategoryKind>("expense");
  const { data: categories } = useCategories(kind);

  return (
    <View className="flex-1 bg-bg">
      <View className="flex-row gap-2 p-4">
        {(["expense", "income"] as const).map((k) => (
          <Pressable
            key={k}
            onPress={() => setKind(k)}
            className={`flex-1 items-center rounded-lg border py-2 ${
              kind === k ? "border-accent bg-accent-soft" : "border-border bg-surface"
            }`}
          >
            <Text className={kind === k ? "text-accent" : "text-fg-muted"}>
              {k === "expense" ? "Expense" : "Income"}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={categories ?? []}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        ListEmptyComponent={<EmptyState message="No categories yet." />}
        renderItem={({ item }) => (
          <Link href={`/category/${item.id}/edit`} asChild>
            <Pressable className="flex-row items-center gap-3 rounded-xl border border-border bg-surface p-3">
              <View
                style={{ backgroundColor: item.color }}
                className="h-9 w-9 items-center justify-center rounded-full"
              >
                {/* Intentionally a literal white, not a theme token — this
                    renders against the category's own arbitrary user-picked
                    color swatch, not a themed surface. */}
                <MaterialCommunityIcons name={item.icon as never} size={16} color="#fff" />
              </View>
              <Text className="text-base text-fg">{item.name}</Text>
            </Pressable>
          </Link>
        )}
      />

      <Link href={`/category/new?kind=${kind}`} asChild>
        <Pressable className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-accent">
          <Text className="text-2xl text-white">+</Text>
        </Pressable>
      </Link>
    </View>
  );
}
