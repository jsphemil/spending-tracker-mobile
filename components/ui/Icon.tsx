import { resolveIcon } from "../../theme/icons";

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

// Thin Lucide wrapper (Erebor design system's own `core/Icon` component is
// "a thin Lucide wrapper, so consumers can swap icon sets in one file") —
// every call site that used to render <MaterialCommunityIcons name=... />
// renders <Icon name=... /> instead, same name/size/color props.
export function Icon({ name, size = 20, color, strokeWidth = 2 }: IconProps) {
  const Cmp = resolveIcon(name);
  return <Cmp size={size} color={color} strokeWidth={strokeWidth} />;
}
