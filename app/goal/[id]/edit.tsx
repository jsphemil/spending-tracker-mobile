import { router, useLocalSearchParams } from "expo-router";
import { Alert, Pressable, Text, View } from "react-native";

import { GoalForm } from "../../../components/GoalForm";
import { deleteGoal, updateGoal } from "../../../db/actions/goals";
import { useGoal } from "../../../db/queries/goals";

export default function EditGoalScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const goalId = Number(id);
  const goal = useGoal(goalId);

  if (!goal) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <Text className="text-fg">Loading…</Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <GoalForm
        submitLabel="Save changes"
        initialValues={goal}
        onSubmit={(values) => {
          updateGoal(goalId, values);
          router.back();
        }}
      />
      <Pressable
        onPress={() =>
          Alert.alert("Delete this goal?", undefined, [
            { text: "Cancel", style: "cancel" },
            {
              text: "Delete",
              style: "destructive",
              onPress: () => {
                deleteGoal(goalId);
                router.back();
              },
            },
          ])
        }
        className="mx-4 mb-6 items-center rounded-lg border border-danger/30 py-3"
      >
        <Text className="font-semibold text-danger">Delete Goal</Text>
      </Pressable>
    </View>
  );
}
