import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

import type { FundBalance, FundProgress } from "../services/funds";
import { formatMoney } from "../services/format";
import { useThemeColors } from "../theme/palette";
import { Icon } from "./ui/Icon";

interface FundRowProps {
  fund: {
    id: number;
    name: string;
    icon: string;
    color: string;
    targetAmountMinor: number;
    status: string;
  };
  balance: FundBalance;
  progress: FundProgress;
  baseCurrency: string;
  /** Masks amounts alongside the Dashboard's net worth privacy toggle. */
  hidden?: boolean;
}

// The one fund row, shared by the Dashboard's Funds card and the /fund
// list. Deliberately a single component rather than two similar-looking
// ones: the app already has a scar from the same balance math existing in
// two places (services/balance.ts and the widget's Kotlin copy) and
// drifting apart.
//
// Presentational only — it takes an already-computed balance and progress
// so the two screens share services/funds.ts's calculation too.
export function FundRow({ fund, balance, progress, baseCurrency, hidden = false }: FundRowProps) {
  const colors = useThemeColors();
  const money = (amountMinor: number) =>
    hidden ? "••••" : formatMoney(amountMinor, baseCurrency);
  const isClosed = fund.status === "closed";

  return (
    <Link href={`/fund/${fund.id}`} asChild>
      <Pressable className="gap-2">
        <View className="flex-row items-center gap-3">
          <View
            className="h-9 w-9 items-center justify-center rounded-icon-badge"
            style={{ backgroundColor: `${fund.color}22` }}
          >
            <Icon name={fund.icon} size={17} color={fund.color} />
          </View>
          <Text className="flex-1 text-sm font-medium text-fg" numberOfLines={1}>
            {fund.name}
          </Text>
          <Text className="font-data text-sm font-medium tabular-nums text-fg">
            {money(balance.fundedMinor)}
            <Text className="text-fg-muted"> / {money(fund.targetAmountMinor)}</Text>
          </Text>
        </View>

        <View className="h-1.5 overflow-hidden rounded-full bg-surface-3">
          <View
            className={`h-full rounded-full ${progress.isFullyFunded ? "bg-success" : "bg-accent"}`}
            style={{ width: `${progress.percent}%` }}
          />
        </View>

        <View className="flex-row items-center justify-between">
          <Text className="text-[11px] text-fg-muted">
            {isClosed ? "Closed" : `${progress.percent.toFixed(0)}%`}
          </Text>
          {/* A closed fund holds nothing, so "X to go" would read as though
              it still needed funding. Say what would actually happen. */}
          {isClosed ? (
            <Text className="text-[11px] text-fg-subtle">
              {balance.heldMinor > 0 ? `${money(balance.heldMinor)} returns if reopened` : "No money set aside"}
            </Text>
          ) : progress.isOverfunded ? (
            <Text className="text-[11px] font-medium text-transfer">
              {money(progress.overMinor)} over target
            </Text>
          ) : progress.isFullyFunded ? (
            <View className="flex-row items-center gap-1">
              <Icon name="check-circle" size={12} color={colors.success} />
              <Text className="text-[11px] font-medium text-success">Ready</Text>
            </View>
          ) : (
            <Text className="text-[11px] text-fg-muted">{money(progress.remainingMinor)} to go</Text>
          )}
        </View>
      </Pressable>
    </Link>
  );
}
