import { Pressable, ScrollView, Switch, Text, View } from "react-native";

import { SettingsRow, SettingsSection } from "../../components/ui/SettingsRow";
import { Icon } from "../../components/ui/Icon";
import {
  CARD_LABELS,
  DEFAULT_LAYOUT,
  isDefaultLayout,
  parseDashboardLayout,
  PINNED_CARD,
  sanitizeDashboardLayout,
  serializeDashboardLayout,
  SHORTCUT_HREFS,
  type DashboardLayout,
  type ShortcutHref,
} from "../../constants/dashboardCards";
import { updateSettings } from "../../db/actions/settings";
import { useSettings } from "../../db/queries/settings";
import { useThemeColors } from "../../theme/palette";

// Mirrors the Dashboard's SHORTCUTS table (label + icon per href); the
// hrefs themselves are the shared constant.
const SHORTCUT_META: Record<ShortcutHref, { label: string; icon: string }> = {
  "/commitments": { label: "Commitments", icon: "calendar-sync-outline" },
  "/categories": { label: "Categories", icon: "shape-outline" },
  "/fund": { label: "Funds", icon: "piggy-bank" },
  "/tag": { label: "Tags", icon: "tag-outline" },
  "/calendar": { label: "Calendar", icon: "calendar-month-outline" },
  "/settings": { label: "Settings", icon: "settings-outline" },
};

// Customise Dashboard (spec.md §5.22): per-card show/hide and ▲/▼
// ordering, plus which shortcut tiles appear. Five rows don't justify a
// drag library. Every change writes the whole layout back through the
// sanitiser, so the stored value can never violate the invariants.
export default function CustomiseDashboardScreen() {
  const { settings } = useSettings();
  const colors = useThemeColors();
  if (!settings) return null;

  const layout = parseDashboardLayout(settings.dashboardLayout);

  function save(next: DashboardLayout) {
    if (!settings) return;
    const clean = sanitizeDashboardLayout(next);
    updateSettings(settings.id, {
      dashboardLayout: isDefaultLayout(clean) ? null : serializeDashboardLayout(clean),
    });
  }

  function move(index: number, delta: -1 | 1) {
    const order = [...layout.order];
    const target = index + delta;
    if (target < 0 || target >= order.length) return;
    [order[index], order[target]] = [order[target], order[index]];
    save({ ...layout, order });
  }

  function setHidden(id: DashboardLayout["order"][number], hidden: boolean) {
    const set = new Set(layout.hidden);
    if (hidden) set.add(id);
    else set.delete(id);
    save({ ...layout, hidden: Array.from(set) });
  }

  function toggleShortcut(href: ShortcutHref) {
    const set = new Set(layout.shortcuts);
    if (set.has(href)) set.delete(href);
    else set.add(href);
    // Keep the Dashboard's own tile order rather than tick order.
    save({ ...layout, shortcuts: SHORTCUT_HREFS.filter((h) => set.has(h)) });
  }

  const switchProps = {
    trackColor: { false: colors.glassFill, true: colors.accent },
    thumbColor: "#ffffff",
    ios_backgroundColor: colors.glassFill,
  };

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ padding: 16, gap: 20 }}>
      <SettingsSection title="Cards">
        {layout.order.map((id, index) => {
          const pinned = id === PINNED_CARD;
          const visible = !layout.hidden.includes(id);
          const last = index === layout.order.length - 1;
          // The pinned card is always first, so the first movable card
          // can't move up past it.
          const canUp = !pinned && index > 1;
          const canDown = !pinned && !last;
          return (
            <View
              key={id}
              className={`flex-row items-center gap-3 px-4 py-3 ${last ? "" : "border-b border-glass-border"}`}
            >
              <View className="flex-1">
                <Text className={`text-base ${visible ? "text-fg" : "text-fg-muted"}`}>
                  {CARD_LABELS[id].label}
                </Text>
                <Text className="text-xs text-fg-muted">{CARD_LABELS[id].description}</Text>
              </View>
              {pinned ? (
                <View className="flex-row items-center gap-1 pr-1">
                  <Icon name="key" size={14} color={colors.fgSubtle} />
                  <Text className="text-xs text-fg-subtle">Always shown</Text>
                </View>
              ) : (
                <>
                  <Pressable
                    onPress={() => move(index, -1)}
                    disabled={!canUp}
                    hitSlop={6}
                    accessibilityRole="button"
                    accessibilityLabel={`Move ${CARD_LABELS[id].label} up`}
                    className="h-8 w-8 items-center justify-center rounded-full bg-glass"
                    style={{ opacity: canUp ? 1 : 0.3 }}
                  >
                    <Icon name="chevron-up" size={16} color={colors.fg} />
                  </Pressable>
                  <Pressable
                    onPress={() => move(index, 1)}
                    disabled={!canDown}
                    hitSlop={6}
                    accessibilityRole="button"
                    accessibilityLabel={`Move ${CARD_LABELS[id].label} down`}
                    className="h-8 w-8 items-center justify-center rounded-full bg-glass"
                    style={{ opacity: canDown ? 1 : 0.3 }}
                  >
                    <Icon name="chevron-down" size={16} color={colors.fg} />
                  </Pressable>
                  <Switch value={visible} onValueChange={(v) => setHidden(id, !v)} {...switchProps} />
                </>
              )}
            </View>
          );
        })}
      </SettingsSection>

      <SettingsSection title="Shortcuts">
        {SHORTCUT_HREFS.map((href, i) => (
          <SettingsRow
            key={href}
            icon={SHORTCUT_META[href].icon}
            label={SHORTCUT_META[href].label}
            right={
              <Switch
                value={layout.shortcuts.includes(href)}
                onValueChange={() => toggleShortcut(href)}
                {...switchProps}
              />
            }
            last={i === SHORTCUT_HREFS.length - 1}
          />
        ))}
      </SettingsSection>

      {!isDefaultLayout(layout) && (
        <SettingsSection title="Reset">
          <SettingsRow
            icon="recycle"
            label="Reset to default"
            sublabel="All cards shown, original order, every shortcut"
            onPress={() => save(DEFAULT_LAYOUT)}
            last
          />
        </SettingsSection>
      )}
    </ScrollView>
  );
}
