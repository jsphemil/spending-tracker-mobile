import { router } from "expo-router";

import { AccountForm } from "../../components/AccountForm";
import { createAccount } from "../../db/actions/accounts";

export default function NewAccountScreen() {
  return (
    <AccountForm
      mode="create"
      submitLabel="Create Account"
      onSubmit={(values) => {
        const id = createAccount(values);
        router.replace(`/accounts/${id}`);
      }}
    />
  );
}
