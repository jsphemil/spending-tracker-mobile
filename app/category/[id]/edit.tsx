import { eq } from "drizzle-orm";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { router, useLocalSearchParams } from "expo-router";
import { Alert, Pressable, Text, View } from "react-native";

import { CategoryForm } from "../../../components/CategoryForm";
import { db } from "../../../db/client";
import { deleteCategory, updateCategory } from "../../../db/actions/categories";
import { categories } from "../../../db/schema";

export default function EditCategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const categoryId = Number(id);
  const { data } = useLiveQuery(
    db.select().from(categories).where(eq(categories.id, categoryId)),
  );
  const category = data?.[0];

  if (!category) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text>Loading…</Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <CategoryForm
        submitLabel="Save Changes"
        initialValues={category}
        onSubmit={(values) => {
          updateCategory(categoryId, values);
          router.back();
        }}
      />
      <Pressable
        onPress={() =>
          Alert.alert(
            "Delete category?",
            "Transactions using this category will become Uncategorized.",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Delete",
                style: "destructive",
                onPress: () => {
                  deleteCategory(categoryId);
                  router.back();
                },
              },
            ],
          )
        }
        className="mx-4 mb-6 items-center rounded-lg border border-red-200 py-3"
      >
        <Text className="font-semibold text-red-600">Delete Category</Text>
      </Pressable>
    </View>
  );
}
