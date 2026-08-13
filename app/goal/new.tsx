import { router } from "expo-router";

import { GoalForm } from "../../components/GoalForm";
import { createGoal } from "../../db/actions/goals";

export default function NewGoalScreen() {
  return (
    <GoalForm
      submitLabel="Create goal"
      onSubmit={(values) => {
        createGoal(values);
        router.back();
      }}
    />
  );
}
