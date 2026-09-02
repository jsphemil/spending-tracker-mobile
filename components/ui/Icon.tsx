import type { ColorValue } from "react-native";

import { resolveIcon } from "../../theme/icons";

interface IconProps {
  name: string;
  size?: number;
  // Widened to accept expo-router's tabBarIcon `color` render-prop type
  // (ColorValue) — actual values passed through this app are always plain
  // strings, Lucide's own color prop just wants `string`.
  color?: ColorValue;
  strokeWidth?: number;
}

// Thin Lucide wrapper (Erebor design system's own `core/Icon` component is
// "a thin Lucide wrapper, so consumers can swap icon sets in one file") —
// every call site that used to render <MaterialCommunityIcons name=... />
// renders <Icon name=... /> instead, same name/size/color props.
// react-hooks/static-components is disabled for this file: resolveIcon is a
// pure lookup in theme/icons.ts's ICON_MAP, so the same `name` yields the
// same component reference on every render. Nothing is constructed here, so
// React never sees a new type and never remounts — the rule just can't see
// through the lookup.
/* eslint-disable react-hooks/static-components */
export function Icon({ name, size = 20, color, strokeWidth = 2 }: IconProps) {
  const Cmp = resolveIcon(name);
  return <Cmp size={size} color={color as string | undefined} strokeWidth={strokeWidth} />;
}
