import { Link } from "expo-router";
import { FlatList, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "../../components/ui/EmptyState";
import { GlobalHeader } from "../../components/GlobalHeader";
import { Icon } from "../../components/ui/Icon";
import { updateSettings } from "../../db/actions/settings";
import { useAccounts } from "../../db/queries/accounts";
import { useSettings } from "../../db/queries/settings";
import { useTagSummaries } from "../../db/queries/tags";
import type { TagsView } from "../../db/schema";
import { useBaseConverter } from "../../hooks/useBaseConverter";
import { formatMoney } from "../../services/format";
import { summarizeTags, type TagSummary } from "../../services/tagSummary";
import { useThemeColors } from "../../theme/palette";

// Tags overview (spec.md §5.3a, redone 2026-09-15): every tag as a card
// with its chosen icon and colour, transaction count and net amount — the
// same net figure its own page leads with — in a grid or a list, the
// choice remembered in settings.tagsView.
export default function TagsListScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const { settings } = useSettings();
  const { data: rows } = useTagSummaries();
  const { data: accounts } = useAccounts();
  const baseCurrency = settings?.baseCurrency ?? "INR";
  const { toBaseMinor } = useBaseConverter((accounts ?? []).map((a) => a.currency));

  const view: TagsView = settings?.tagsView ?? "grid";
  const tags = summarizeTags(rows ?? [], toBaseMinor);

  function setView(next: TagsView) {
    if (settings && next !== view) updateSettings(settings.id, { tagsView: next });
  }

  return (
    <View className="flex-1 bg-bg">
      <GlobalHeader />
      <View className="flex-row items-center justify-between px-4 pb-2 pt-4">
        <Text className="text-lg font-display-xbold text-fg">Tags</Text>
        <View className="flex-row overflow-hidden rounded-full border border-glass-border bg-glass">
          {(["grid", "list"] as const).map((v) => (
            <Pressable
              key={v}
              onPress={() => setView(v)}
              accessibilityRole="button"
              accessibilityLabel={v === "grid" ? "Grid view" : "List view"}
              accessibilityState={{ selected: view === v }}
              className={`h-9 w-11 items-center justify-center ${view === v ? "bg-accent-soft" : ""}`}
            >
              <Icon
                name={v === "grid" ? "layout-grid" : "layout-list"}
                size={17}
                color={view === v ? colors.accent : colors.fgMuted}
              />
            </Pressable>
          ))}
        </View>
      </View>

      <FlatList
        // Changing numColumns on a mounted FlatList is an error, so the
        // list is remounted when the view flips.
        key={view}
        data={tags}
        keyExtractor={(item) => String(item.id)}
        numColumns={view === "grid" ? 2 : 1}
        columnWrapperStyle={view === "grid" ? { gap: 12 } : undefined}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 96, gap: 12 }}
        ListEmptyComponent={<EmptyState message="No tags yet. Add one from any transaction." />}
        renderItem={({ item }) =>
          view === "grid" ? (
            <TagCard tag={item} currency={baseCurrency} />
          ) : (
            <TagRow tag={item} currency={baseCurrency} />
          )
        }
      />
    </View>
  );
}

function netClass(netMinor: number): string {
  return netMinor > 0 ? "text-success" : netMinor < 0 ? "text-danger" : "text-fg-muted";
}

function netLabel(netMinor: number, currency: string): string {
  if (netMinor === 0) return "—";
  return `${netMinor > 0 ? "+" : "−"}${formatMoney(Math.abs(netMinor), currency)}`;
}

function countLabel(n: number): string {
  return n === 1 ? "1 transaction" : `${n} transactions`;
}

function TagCard({ tag, currency }: { tag: TagSummary; currency: string }) {
  return (
    <Link href={`/tag/${encodeURIComponent(tag.name)}`} asChild>
      <Pressable className="flex-1 gap-3 rounded-card border border-glass-border bg-glass p-4">
        <View style={{ backgroundColor: tag.color }} className="h-10 w-10 items-center justify-center rounded-full">
          <Icon name={tag.icon} size={18} color="#fff" />
        </View>
        <View className="gap-0.5">
          <Text className="text-base font-medium text-fg" numberOfLines={2}>
            {tag.name}
          </Text>
          <Text className="text-xs text-fg-muted">{countLabel(tag.txCount)}</Text>
        </View>
        <Text className={`font-data text-sm font-semibold tabular-nums ${netClass(tag.netMinor)}`}>
          {netLabel(tag.netMinor, currency)}
        </Text>
      </Pressable>
    </Link>
  );
}

function TagRow({ tag, currency }: { tag: TagSummary; currency: string }) {
  return (
    <Link href={`/tag/${encodeURIComponent(tag.name)}`} asChild>
      <Pressable className="flex-row items-center justify-between rounded-card border border-glass-border bg-glass p-4">
        <View className="flex-1 flex-row items-center gap-3 pr-3">
          <View style={{ backgroundColor: tag.color }} className="h-10 w-10 items-center justify-center rounded-full">
            <Icon name={tag.icon} size={18} color="#fff" />
          </View>
          <View className="flex-1">
            <Text className="text-base font-medium text-fg" numberOfLines={1}>
              {tag.name}
            </Text>
            <Text className="text-xs text-fg-muted">{countLabel(tag.txCount)}</Text>
          </View>
        </View>
        <Text className={`font-data text-sm font-semibold tabular-nums ${netClass(tag.netMinor)}`}>
          {netLabel(tag.netMinor, currency)}
        </Text>
      </Pressable>
    </Link>
  );
}
