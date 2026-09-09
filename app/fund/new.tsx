import { router } from "expo-router";

import { FundForm } from "../../components/FundForm";
import { createFund } from "../../db/actions/funds";

export default function NewFundScreen() {
  return (
    <FundForm
      submitLabel="Create fund"
      showSuggestions
      onSubmit={(values) => {
        const id = createFund(values);
        // Straight to the new fund's page, where the Add money button is
        // the obvious next action — a fund left sitting at zero isn't
        // doing anything for anyone. `replace` so Back doesn't return to
        // the create form.
        router.replace(`/fund/${id}`);
      }}
    />
  );
}
