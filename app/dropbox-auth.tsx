import { useEffect } from "react";
import { router } from "expo-router";

// Dropbox's OAuth redirect (spendingtracker://dropbox-auth) lands here
// because expo-router's own deep-link handling matches it as a route,
// separately from expo-auth-session's promptAsync() promise (which is
// what actually resolves the connect flow in services/dropbox.ts). This
// screen only exists so that landing here doesn't show "Unmatched
// Route" — it has nothing to do and bounces straight back to Settings
// (the old Profile tab's content lives there now, spec.md §5.19).
export default function DropboxAuthCallback() {
  useEffect(() => {
    router.replace("/settings");
  }, []);

  return null;
}
