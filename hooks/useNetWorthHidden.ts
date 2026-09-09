import { useSyncExternalStore } from "react";

// Whether the Dashboard's net worth figures are masked, held for the life
// of the JS context rather than in the database.
//
// It starts hidden on every app open and a reveal lasts only until the app
// is closed (spec.md §5.19). That's deliberate: the Dashboard is the first
// screen shown on open, so the point of the toggle is that someone glancing
// at a freshly-opened app never sees the numbers. A remembered preference
// defeats that the moment you reveal once.
//
// Module state rather than a settings column, for two reasons. It resets
// exactly when the app is closed and reopened, which is the definition we
// want and is free. And persisting it would reintroduce the flash the
// feature exists to prevent: settings load asynchronously, so the Dashboard
// would render one frame with the previous session's *revealed* value
// before a reset could apply. Starting hidden makes that unrepresentable.
//
// It survives navigating between tabs (module scope, not component state),
// and resets on a dev fast-refresh, which matches a cold start closely
// enough for testing.
let hidden = true;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function toggleNetWorthHidden(): void {
  hidden = !hidden;
  for (const listener of listeners) listener();
}

export function useNetWorthHidden(): boolean {
  return useSyncExternalStore(subscribe, () => hidden);
}
