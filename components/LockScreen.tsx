import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "./ui/Button";
import { Icon } from "./ui/Icon";
import { authenticate } from "../services/appLock";
import { useThemeColors } from "../theme/palette";

// The biometric gate's only screen (spec.md §5.23). Rendered by
// app/_layout.tsx *instead of* the navigator while locked — not over it —
// so nothing underneath renders or can be captured. Prompts once on mount;
// the button is the retry after a cancel or a failed attempt.
export function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const colors = useThemeColors();
  const [failed, setFailed] = useState(false);
  // Guards against a second prompt while one is open (the mount prompt and
  // an eager tap). No "prompting" state is kept on purpose: the system
  // sheet is modal, so there is nothing for a busy indicator to add, and
  // keeping the mount call free of synchronous setState satisfies the
  // set-state-in-effect rule without a disable comment.
  const inFlight = useRef(false);

  function prompt() {
    if (inFlight.current) return;
    inFlight.current = true;
    authenticate()
      .then((ok) => {
        if (ok) onUnlock();
        else setFailed(true);
      })
      .catch(() => setFailed(true))
      .finally(() => {
        inFlight.current = false;
      });
  }

  useEffect(() => {
    prompt();
    // Mount-only: this is the automatic first prompt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-bg">
      <View className="flex-1 items-center justify-center gap-4 px-8">
        <Icon name="logo" size={40} color={colors.accent} />
        <Text className="font-display text-2xl font-bold text-fg">Erebor</Text>
        <Text className="text-center text-sm text-fg-muted">
          {failed
            ? "Couldn't verify it's you. Try again, or use your phone's PIN or pattern."
            : "Unlock to see your finances."}
        </Text>
        <Button
          onPress={() => {
            setFailed(false);
            prompt();
          }}
          className="mt-4 w-full"
        >
          Unlock
        </Button>
      </View>
    </SafeAreaView>
  );
}
