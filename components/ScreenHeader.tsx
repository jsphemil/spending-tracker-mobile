import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { Link, useRouter, type Href } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { Icon } from "./ui/Icon";
import { useThemeColors } from "../theme/palette";

// The top bar for every main and browse screen (spec.md §5.24 "Shell"),
// replacing V2's GlobalHeader and its four permanent controls. Each screen
// names itself and passes only the actions that make sense there — Settings
// on the Dashboard, New account on Accounts, and so on. Browse screens
// reached from elsewhere (Funds, Commitments…) pass `back`. Settings and
// the create/edit modals keep their in-navigator headers.
export function ScreenHeader({
  title,
  back = false,
  brand = false,
  children,
}: {
  title: string;
  back?: boolean;
  /** Shows the Erebor mark before the title — the Dashboard only. */
  brand?: boolean;
  /** Trailing actions, usually HeaderAction buttons. */
  children?: ReactNode;
}) {
  const colors = useThemeColors();
  const router = useRouter();

  return (
    <SafeAreaView edges={["top"]} className="bg-bg">
      <View className="min-h-14 flex-row items-center gap-2 px-4 py-2">
        {back && (
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={8}
            className="-ml-2 h-11 w-11 items-center justify-center"
          >
            <Icon name="arrow-left" size={22} color={colors.fg} />
          </Pressable>
        )}
        {brand && <Icon name="logo" size={20} color={colors.accent} />}
        <Text
          accessibilityRole="header"
          numberOfLines={1}
          className={`flex-1 font-display text-fg ${brand ? "text-lg" : "text-xl"}`}
        >
          {title}
        </Text>
        <View className="flex-row items-center gap-1">{children}</View>
      </View>
    </SafeAreaView>
  );
}

// A 44dp icon button for ScreenHeader's trailing slot — a link when given
// `href`, a plain button when given `onPress`. `active` adds an accent dot
// (e.g. Filter while a filter is applied) and says so to screen readers.
export function HeaderAction({
  icon,
  label,
  href,
  onPress,
  active = false,
}: {
  icon: string;
  label: string;
  href?: Href;
  onPress?: () => void;
  active?: boolean;
}) {
  const colors = useThemeColors();
  const button = (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={active ? `${label}, active` : label}
      className="h-11 w-11 items-center justify-center rounded-full active:bg-glass-press"
    >
      <Icon name={icon} size={22} color={colors.fg} />
      {active && <View className="absolute right-2 top-2 h-2 w-2 rounded-full bg-accent-fill" />}
    </Pressable>
  );
  return href ? (
    <Link href={href} asChild>
      {button}
    </Link>
  ) : (
    button
  );
}
