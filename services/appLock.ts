import * as LocalAuthentication from "expo-local-authentication";
import type { AppStateStatus } from "react-native";

// Biometric app lock (spec.md §5.23). This is a device lock on local data,
// not a login: nothing is stored by the app — no secret, no hash — the OS
// answers "is this the device owner?" and app/_layout.tsx gates on it.

// How long the app may sit in the background before coming back locked.
// Long enough that switching to the mail app to send feedback and back
// doesn't re-prompt; short enough that a phone left on a desk doesn't stay
// open. Fixed rather than a setting — decided with the user 2026-09-11.
export const RELOCK_GRACE_MS = 30_000;

// True only when the lock can actually be satisfied on this device. Both
// checks are required: hardware with nothing enrolled would let the toggle
// turn on and then fail every prompt.
export async function canUseBiometrics(): Promise<boolean> {
  const [hasHardware, enrolled] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
  ]);
  return hasHardware && enrolled;
}

// One system prompt. disableDeviceFallback is left false on purpose so the
// device PIN/pattern is accepted when biometrics fail — a wet finger must
// not lock someone out of their own finances (user's decision 2026-09-11).
// On Android the module then requests BIOMETRIC_WEAK | DEVICE_CREDENTIAL,
// which is also why no cancelLabel is passed: BiometricPrompt ignores it
// whenever device credentials are allowed.
export async function authenticate(): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: "Unlock Erebor",
    disableDeviceFallback: false,
  });
  return result.success;
}

// The re-lock decision, kept pure so it can be unit-tested without
// AppState. `backgroundedAt` is when the app last left the foreground
// (null if it hasn't since the last unlock).
export function shouldRelock(
  {
    enabled,
    previous,
    next,
    backgroundedAt,
  }: {
    enabled: boolean;
    previous: AppStateStatus;
    next: AppStateStatus;
    backgroundedAt: number | null;
  },
  now: number,
): boolean {
  if (!enabled) return false;
  if (next !== "active" || previous === "active") return false;
  if (backgroundedAt == null) return false;
  return now - backgroundedAt >= RELOCK_GRACE_MS;
}
