import Constants from "expo-constants";
import { Alert, Linking, Platform } from "react-native";

import { buildFeedbackMailto, FEEDBACK_ADDRESS } from "./feedback";

// The React Native side of services/feedback.ts — gathers the device
// context and opens the mail app. Split out so the URL builder stays
// importable under node.
export function appVersionLabel(): { appVersion: string; buildNumber: string } {
  return {
    appVersion: Constants.expoConfig?.version ?? "unknown",
    // nativeBuildVersion is the versionCode of the installed binary — with
    // EAS's remote auto-increment that is the only place it exists at
    // runtime (app.json never carries it).
    buildNumber: Constants.nativeBuildVersion ?? "unknown",
  };
}

export async function sendFeedback(): Promise<void> {
  const url = buildFeedbackMailto({
    ...appVersionLabel(),
    os: Platform.OS,
    osVersion: String(Platform.Version),
  });
  try {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
      return;
    }
  } catch {
    // fall through to the copyable address
  }
  Alert.alert("No mail app found", `Write to ${FEEDBACK_ADDRESS} from any device — mention the app version shown under About Erebor.`);
}
