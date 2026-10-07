import { useEffect, useState } from "react";
import { AccessibilityInfo, Animated, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "./ui/Icon";
import { useThemeColors } from "../theme/palette";
import { NAV_BAR_HEIGHT } from "../theme/tabBar";

export interface SavedNotice {
  title: string; // "Expense recorded"
  detail: string; // "₹149.00 · HDFC Salary"
  accountId: number;
}

// "Your transaction was saved" confirmation (spec.md §5.24, user request
// 2026-10-07). A one-slot module store rather than context: the add screen
// shows a notice and closes in the same tick, and the banner — mounted once
// in app/_layout.tsx, above every screen — outlives it.
let listener: ((n: SavedNotice | null) => void) | null = null;

export function showSaved(notice: SavedNotice) {
  listener?.(notice);
}

const VISIBLE_MS = 5000;

export function SaveConfirmation() {
  const [notice, setNotice] = useState<SavedNotice | null>(null);
  const [key, setKey] = useState(0);
  const [opacity] = useState(() => new Animated.Value(0));
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  useEffect(() => {
    listener = (n) => {
      setNotice(n);
      setKey((k) => k + 1);
    };
    return () => {
      listener = null;
    };
  }, []);

  // Each new notice restarts the fade-in and the dismiss timer.
  useEffect(() => {
    if (!notice) return;
    AccessibilityInfo.announceForAccessibility(`${notice.title}. ${notice.detail}`);
    Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setNotice(null));
    }, VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [key, notice, opacity]);

  if (!notice) return null;

  const go = (href: Parameters<typeof router.navigate>[0]) => {
    setNotice(null);
    opacity.setValue(0);
    router.navigate(href);
  };

  return (
    <Animated.View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: 12,
        right: 12,
        // Clear of the bottom navigation bar and its docked "+".
        bottom: insets.bottom + NAV_BAR_HEIGHT + 36,
        opacity,
      }}
    >
      <View
        accessibilityLiveRegion="polite"
        className="flex-row items-center gap-3 rounded-2xl px-4 py-3"
        style={{ backgroundColor: colors.surface3 }}
      >
        <Icon name="check-circle" size={20} color={colors.success} />
        <View className="flex-1">
          <Text className="text-sm font-medium text-fg">{notice.title}</Text>
          <Text className="text-xs text-fg-muted" numberOfLines={1}>
            {notice.detail}
          </Text>
        </View>
        <Pressable
          onPress={() => go(`/accounts/${notice.accountId}`)}
          accessibilityRole="button"
          accessibilityLabel="View account"
          hitSlop={8}
          className="min-h-11 justify-center px-1"
        >
          <Text className="text-sm font-semibold text-accent">Account</Text>
        </Pressable>
        <Pressable
          onPress={() => go("/transactions")}
          accessibilityRole="button"
          accessibilityLabel="View transactions"
          hitSlop={8}
          className="min-h-11 justify-center px-1"
        >
          <Text className="text-sm font-semibold text-accent">Transactions</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}
