import { router, useLocalSearchParams } from "expo-router";

import { CategoryForm } from "../../components/CategoryForm";
import { createCategory } from "../../db/actions/categories";
import type { CategoryKind } from "../../db/schema";

export default function NewCategoryScreen() {
  const { kind } = useLocalSearchParams<{ kind?: string }>();

  return (
    <CategoryForm
      submitLabel="Create Category"
      initialValues={{ kind: (kind as CategoryKind) ?? "expense" }}
      onSubmit={(values) => {
        createCategory(values);
        router.back();
      }}
    />
  );
}
