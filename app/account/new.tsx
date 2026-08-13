import { router } from "expo-router";

import { AccountForm } from "../../components/AccountForm";
import { createAccount } from "../../db/actions/accounts";

export default function NewAccountScreen() {
  return (
    <AccountForm
      mode="create"
      submitLabel="Create Account"
      onSubmit={(values) => {
        // This screen is presented over the tabs as a root-level route,
        // while the account detail page lives inside the Accounts tab's
        // own nested Stack — router.replace() across that navigator
        // boundary intermittently corrupted the back-stack (occasional
        // "back navigation missing" after creating an account, reported
        // 2026-08-12, only recoverable by a full reload). router.back()
        // just dismisses this screen and returns to the Accounts list,
        // the same safe pattern every other "new X" screen already uses
        // (category, goal, transaction) — trades jumping straight into
        // the new account's detail page for not corrupting navigation.
        createAccount(values);
        router.back();
      }}
    />
  );
}
