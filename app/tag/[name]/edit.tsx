import { router, useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";

import { TagForm } from "../../../components/TagForm";
import { deleteTag, updateTag } from "../../../db/actions/tags";
import { useTagByName, useTagTransactions } from "../../../db/queries/tags";

export default function EditTagScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const tagName = decodeURIComponent(name);
  const { tag } = useTagByName(tagName);
  const { data: rows } = useTagTransactions(tagName);

  if (!tag) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <Text className="text-fg">Loading…</Text>
      </View>
    );
  }

  return (
    <TagForm
      initialValues={{ name: tag.name, icon: tag.icon, color: tag.color }}
      transactionCount={rows?.length ?? 0}
      onSubmit={(values) => {
        const error = updateTag(tag.id, values);
        if (error) return error;
        // The tag page is keyed by name, so after a rename the page
        // underneath no longer resolves: drop back to the overview and open
        // the renamed page from there.
        if (values.name !== tag.name) {
          router.dismissTo("/tag");
          router.push(`/tag/${encodeURIComponent(values.name)}`);
        } else {
          router.back();
        }
        return null;
      }}
      onDelete={() => {
        deleteTag(tag.id);
        // The tag page underneath is gone with it; land on the overview.
        router.dismissTo("/tag");
      }}
    />
  );
}
