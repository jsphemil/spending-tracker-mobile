import { useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";

import { shouldRelock } from "../services/appLock";

// Holds the app-lock gate's state for app/_layout.tsx (spec.md §5.23).
//
// `enabled` is undefined until settings have loaded, false when the lock is
// off, true when on. The gate renders the lock screen *instead of* the
// navigator, so the answer has to be right on the very first frame — which
// is why `locked` starts true ("locked until proven otherwise") rather than
// being set from an effect that would paint one unlocked frame first, and
// why the undefined→true transition on a cold start keeps it locked while
// a false→true transition (the user just switched it on in Settings, so
// they are demonstrably inside the app) does not.
export function useAppLock(enabled: boolean | undefined): {
  locked: boolean;
  unlock: () => void;
} {
  const [locked, setLocked] = useState(true);
  const backgroundedAt = useRef<number | null>(null);
  const previousState = useRef<AppStateStatus>(AppState.currentState);

  // React's documented "adjust state when a prop changes" pattern — a
  // conditional setState during render, not an effect, so the adjustment
  // lands in the same render pass.
  const [prevEnabled, setPrevEnabled] = useState(enabled);
  if (enabled !== prevEnabled) {
    setPrevEnabled(enabled);
    if (prevEnabled === false && enabled === true) setLocked(false);
  }

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      const previous = previousState.current;
      previousState.current = next;
      if (next !== "active") {
        // Only stamp the first departure — Android can report
        // background→inactive→background sequences, and the grace period
        // should count from when the user actually left.
        if (backgroundedAt.current == null) backgroundedAt.current = Date.now();
        return;
      }
      if (
        shouldRelock(
          { enabled: enabled === true, previous, next, backgroundedAt: backgroundedAt.current },
          Date.now(),
        )
      ) {
        setLocked(true);
      }
      backgroundedAt.current = null;
    });
    return () => sub.remove();
  }, [enabled]);

  return {
    locked: enabled === true && locked,
    unlock: () => {
      backgroundedAt.current = null;
      setLocked(false);
    },
  };
}
