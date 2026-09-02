import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { Link, type Href } from "expo-router";

import { Icon } from "./Icon";
import { useThemeColors } from "../../theme/palette";

interface SettingsSectionProps {
  title: string;
  children: ReactNode;
}

// Grouped-section shell for Settings V2 (spec.md §5.19) — compact rows,
// meaningful icons, chevrons, consistent spacing, per the master prompt's
// "clean grouped structure inspired by the provided reference design."
export function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <View className="gap-2">
      <Text className="px-1 text-xs font-semibold uppercase tracking-wide text-fg-subtle">{title}</Text>
      <View className="overflow-hidden rounded-2xl border border-glass-border bg-glass">{children}</View>
    </View>
  );
}

interface SettingsRowProps {
  icon: string;
  label: string;
  sublabel?: string;
  href?: Href;
  onPress?: () => void;
  right?: ReactNode;
  last?: boolean;
}

export function SettingsRow({ icon, label, sublabel, href, onPress, right, last = false }: SettingsRowProps) {
  const colors = useThemeColors();
  const content = (
    <View
      className={`flex-row items-center gap-3 px-4 py-3.5 ${last ? "" : "border-b border-glass-border"}`}
    >
      <View className="h-8 w-8 items-center justify-center rounded-full bg-glass-fill-strong">
        <Icon name={icon} size={16} color={colors.fg} />
      </View>
      <View className="flex-1">
        <Text className="text-base text-fg">{label}</Text>
        {sublabel ? <Text className="text-xs text-fg-muted">{sublabel}</Text> : null}
      </View>
      {right ?? (href || onPress ? <Icon name="chevron-right" size={18} color={colors.fgSubtle} /> : null)}
    </View>
  );

  if (href) {
    return (
      <Link href={href} asChild>
        <Pressable accessibilityRole="button" accessibilityLabel={label}>
          {content}
        </Pressable>
      </Link>
    );
  }
  if (onPress) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
        {content}
      </Pressable>
    );
  }
  return content;
}
