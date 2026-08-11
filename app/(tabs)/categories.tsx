import { useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { FlatList, Pressable, Text, View } from "react-native";

import { useCategories } from "../../db/queries/categories";
import type { CategoryKind } from "../../db/schema";

export default function CategoriesScreen() {
  const [kind, setKind] = useState<CategoryKind>("expense");
  const { data: categories } = useCategories(kind);

  return (
    <View className="flex-1 bg-white">
      <View className="flex-row gap-2 p-4">
        {(["expense", "income"] as const).map((k) => (
          <Pressable
            key={k}
            onPress={() => setKind(k)}
            className={`flex-1 items-center rounded-lg border py-2 ${
              kind === k ? "border-blue-600 bg-blue-50" : "border-gray-200"
            }`}
          >
            <Text className={kind === k ? "text-blue-600" : "text-gray-700"}>
              {k === "expense" ? "Expense" : "Income"}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={categories ?? []}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        ListEmptyComponent={
          <Text className="py-8 text-center text-gray-500">No categories yet.</Text>
        }
        renderItem={({ item }) => (
          <Link href={`/category/${item.id}/edit`} asChild>
            <Pressable className="flex-row items-center gap-3 rounded-xl border border-gray-200 p-3">
              <View
                style={{ backgroundColor: item.color }}
                className="h-9 w-9 items-center justify-center rounded-full"
              >
                <MaterialCommunityIcons name={item.icon as never} size={16} color="#fff" />
              </View>
              <Text className="text-base text-gray-900">{item.name}</Text>
            </Pressable>
          </Link>
        )}
      />

      <Link href={`/category/new?kind=${kind}`} asChild>
        <Pressable className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-blue-600">
          <Text className="text-2xl text-white">+</Text>
        </Pressable>
      </Link>
    </View>
  );
}
