import { router, useLocalSearchParams } from "expo-router";
import { Text } from "react-native";

import { FundForm } from "../../../components/FundForm";
import { updateFund } from "../../../db/actions/funds";
import { useFund } from "../../../db/queries/funds";

export default function EditFundScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const fundId = Number(id);
  const fund = useFund(fundId);

  if (!fund) return <Text className="p-4 text-fg-muted">Loading…</Text>;

  return (
    <FundForm
      initialValues={fund}
      submitLabel="Save changes"
      onSubmit={(values) => {
        updateFund(fundId, values);
        router.back();
      }}
    />
  );
}
