import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
// React Navigation isn't a direct dependency — expo-router vendors it, and
// re-exports the tab types from this entry point.
import type { BottomTabBarProps } from "expo-router/js-tabs";

import { Icon } from "./ui/Icon";
import { GLOW_SHADOWS, GRADIENTS, NAV_SHADOW } from "../theme/gradients";
import { useThemeColors } from "../theme/palette";
import { FAB_SIZE, NAV_BAR_HEIGHT } from "../theme/tabBar";

// Gap left in the middle of the row so the docked "+" doesn't sit on top of
// a tab. Slightly wider than the button itself to keep breathing room
// between it and the innermost tab labels.
const FAB_GUTTER = FAB_SIZE + 24;

// The bottom navigation bar, replacing the default React Navigation tab bar
// so the "+" can be docked into it rather than floating separately: the four
// tabs split 2 | gap | 2 around a centred button that straddles the bar's top
// edge. A full-width bar flush with the bottom edge (not the earlier inset
// floating pill), so the docked button reads as part of it.
export function BottomNavBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const router = useRouter();

  const half = Math.ceil(state.routes.length / 2);

  const renderTab = (route: (typeof state.routes)[number], index: number) => {
    const { options } = descriptors[route.key];
    const focused = state.index === index;
    const color = focused ? colors.accent : colors.fgSubtle;
    const label =
      typeof options.title === "string" ? options.title : route.name;

    // Mirrors React Navigation's own default tab press behaviour: emit the
    // event first, and only navigate if nothing preventDefault()s it, so
    // things like scroll-to-top on re-press keep working.
    const onPress = () => {
      const event = navigation.emit({
        type: "tabPress",
        target: route.key,
        canPreventDefault: true,
      });
      if (!focused && !event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    };

    return (
      <Pressable
        key={route.key}
        onPress={onPress}
        onLongPress={() => navigation.emit({ type: "tabLongPress", target: route.key })}
        accessibilityRole="button"
        accessibilityState={focused ? { selected: true } : {}}
        accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
        className="flex-1 items-center justify-center gap-1"
      >
        {options.tabBarIcon?.({ focused, color, size: 24 })}
        <Text
          numberOfLines={1}
          style={{ color, fontFamily: "Inter_500Medium", fontSize: 10 }}
        >
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingBottom: insets.bottom,
        ...NAV_SHADOW,
      }}
    >
      <View style={{ height: NAV_BAR_HEIGHT, flexDirection: "row", alignItems: "center" }}>
        {state.routes.slice(0, half).map((route, i) => renderTab(route, i))}
        <View style={{ width: FAB_GUTTER }} />
        {state.routes.slice(half).map((route, i) => renderTab(route, i + half))}
      </View>

      {/* Straddles the bar's top edge — half above it, half over it. */}
      <View
        pointerEvents="box-none"
        style={{ position: "absolute", top: -FAB_SIZE / 2, left: 0, right: 0, alignItems: "center" }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add transaction"
          onPress={() => router.push("/transaction/new")}
          style={{ borderRadius: 9999, ...GLOW_SHADOWS.brand }}
        >
          <LinearGradient
            colors={GRADIENTS.brand}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              height: FAB_SIZE,
              width: FAB_SIZE,
              borderRadius: 9999,
              alignItems: "center",
              justifyContent: "center",
              // A ring in the bar's own colour so the circle reads as cut
              // into the bar rather than pasted on top of it.
              borderWidth: 4,
              borderColor: colors.surface,
            }}
          >
            <Icon name="plus" size={26} color="#ffffff" strokeWidth={2.5} />
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}
