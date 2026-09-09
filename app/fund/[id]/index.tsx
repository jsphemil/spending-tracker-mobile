import { useMemo, useState } from "react";
import { Link, router, useLocalSearchParams } from "expo-router";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FundAllocationSheet, type AllocationMode } from "../../../components/FundAllocationSheet";
import { GlobalHeader } from "../../../components/GlobalHeader";
import { Icon } from "../../../components/ui/Icon";
import { UnconvertedCurrenciesNote } from "../../../components/UnconvertedCurrenciesNote";
import {
  addFundAllocation,
  closeFund,
  deleteFund,
  deleteFundAllocation,
  reopenFund,
} from "../../../db/actions/funds";
import { db } from "../../../db/client";
import { useAccounts } from "../../../db/queries/accounts";
import { useFund, useFundAllocations } from "../../../db/queries/funds";
import { useSettings } from "../../../db/queries/settings";
import { useFilteredTransactions } from "../../../db/queries/transactions";
import { useBaseConverter } from "../../../hooks/useBaseConverter";
import { formatMoney } from "../../../services/format";
import {
  computeFundProgress,
  emptyFundBalance,
  getFundBalances,
  getFundHistory,
  getFundLinkedCurrencies,
} from "../../../services/funds";
import { currentMonthPeriod, monthRange } from "../../../services/period";
import { useThemeColors } from "../../../theme/palette";

export default function FundDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const fundId = Number(id);
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const { settings } = useSettings();
  const baseCurrency = settings?.baseCurrency ?? "INR";
  const fund = useFund(fundId);
  const { data: accounts } = useAccounts();
  const [sheetMode, setSheetMode] = useState<AllocationMode | null>(null);

  const linkedCurrencies = getFundLinkedCurrencies(db);
  const { toBaseMinor, unconvertedCurrencies } = useBaseConverter([
    ...(accounts ?? []).map((a) => a.currency),
    ...linkedCurrencies,
  ]);

  // Both subscribed for their re-render, not their rows — the figures below
  // come from synchronous service reads that aren't reactive on their own.
  const range = useMemo(() => monthRange(currentMonthPeriod()), []);
  useFilteredTransactions({ range });
  useFundAllocations(fundId);

  // No asOfDate: this screen is "where does this fund stand right now",
  // the same today-anchored choice the Dashboard's Action section makes.
  const balance = getFundBalances(db, toBaseMinor).get(fundId) ?? emptyFundBalance(fundId);
  const history = getFundHistory(db, fundId);

  if (!fund) return <Text className="p-4 text-fg-muted">Loading…</Text>;

  const progress = computeFundProgress(fund.targetAmountMinor, balance);
  const isClosed = fund.status === "closed";

  function handleAllocate(amountMinor: number, note: string | null) {
    addFundAllocation({
      fundId,
      // The sheet always hands back a positive number; the sign is the
      // difference between adding and releasing.
      amountMinor: sheetMode === "release" ? -amountMinor : amountMinor,
      date: new Date(),
      note,
    });
    setSheetMode(null);
  }

  function handleClose() {
    Alert.alert(
      "Close this fund?",
      balance.fundedMinor > 0
        ? `${formatMoney(balance.fundedMinor, baseCurrency)} returns to your unallocated wealth. Your net worth doesn't change, and past spending stays linked.`
        : "Past spending stays linked and your net worth doesn't change.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Close fund",
          style: "destructive",
          onPress: () => closeFund(fundId, balance.fundedMinor),
        },
      ],
    );
  }

  function handleDelete() {
    Alert.alert("Delete this fund?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          try {
            deleteFund(fundId);
            router.dismissTo("/fund");
          } catch (error) {
            // Guarded in db/actions/funds.ts — a fund with history must be
            // closed instead, so its past spending stays explained.
            Alert.alert(
              "Can't delete this fund",
              error instanceof Error ? error.message : "Close it instead.",
            );
          }
        },
      },
    ]);
  }

  return (
    <View className="flex-1 bg-bg">
      <GlobalHeader />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 16 }}
      >
        <View className="rounded-card border border-glass-border bg-glass p-4">
          <View className="flex-row items-center gap-3">
            <View
              className="h-11 w-11 items-center justify-center rounded-icon-badge"
              style={{ backgroundColor: `${fund.color}22` }}
            >
              <Icon name={fund.icon} size={20} color={fund.color} />
            </View>
            <View className="flex-1">
              <Text className="text-base font-display-xbold text-fg">{fund.name}</Text>
              {isClosed && <Text className="text-xs font-medium text-fg-muted">Closed</Text>}
            </View>
            <Link href={`/fund/${fundId}/edit`} asChild>
              <Pressable hitSlop={8} accessibilityRole="button" accessibilityLabel="Edit fund">
                <Icon name="pencil-outline" size={18} color={colors.fgMuted} />
              </Pressable>
            </Link>
          </View>

          <Text className="font-data mt-4 text-3xl font-bold tabular-nums text-fg">
            {formatMoney(balance.fundedMinor, baseCurrency)}
            <Text className="text-base font-semibold text-fg-muted">
              {" / "}
              {formatMoney(fund.targetAmountMinor, baseCurrency)}
            </Text>
          </Text>

          <View className="mt-3 h-2 overflow-hidden rounded-full bg-surface-3">
            <View
              className={`h-full rounded-full ${progress.isFullyFunded ? "bg-success" : "bg-accent"}`}
              style={{ width: `${progress.percent}%` }}
            />
          </View>

          <View className="mt-2 flex-row items-center justify-between">
            <Text className="text-xs text-fg-muted">{progress.percent.toFixed(0)}% there</Text>
            {progress.isOverfunded ? (
              <Text className="text-xs font-medium text-transfer">
                {formatMoney(progress.overMinor, baseCurrency)} over target
              </Text>
            ) : progress.isFullyFunded ? (
              <Text className="text-xs font-medium text-success">Fully funded — ready</Text>
            ) : (
              <Text className="text-xs text-fg-muted">
                {formatMoney(progress.remainingMinor, baseCurrency)} to go
              </Text>
            )}
          </View>

          {fund.targetDate && (
            <Text className="mt-2 text-xs text-fg-muted">
              Needed by{" "}
              {fund.targetDate.toLocaleDateString(undefined, {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </Text>
          )}

          {balance.overspentMinor > 0 && (
            <Text className="mt-2 text-xs font-medium text-transfer">
              {formatMoney(balance.overspentMinor, baseCurrency)} of the spending on this fund came
              from your unallocated wealth.
            </Text>
          )}

          {progress.isOverfunded && !isClosed && (
            <Text className="mt-2 text-xs text-fg-subtle">
              You can leave it, raise the target, or release the extra — nothing happens
              automatically.
            </Text>
          )}

          <UnconvertedCurrenciesNote currencies={unconvertedCurrencies} subject="This fund" />
        </View>

        {!isClosed && (
          <View className="flex-row gap-3">
            <Pressable
              onPress={() => setSheetMode("add")}
              className="flex-1 items-center rounded-full bg-accent py-3"
            >
              <Text className="text-base font-semibold text-white">Add money</Text>
            </Pressable>
            <Pressable
              onPress={() => setSheetMode("release")}
              disabled={balance.fundedMinor <= 0}
              className={`flex-1 items-center rounded-full border border-glass-border bg-glass py-3 ${
                balance.fundedMinor <= 0 ? "opacity-50" : ""
              }`}
            >
              <Text className="text-base font-semibold text-fg">Release</Text>
            </Pressable>
          </View>
        )}

        <View className="rounded-card border border-glass-border bg-glass p-4">
          <Text className="mb-3 text-sm font-display text-fg">History</Text>
          {history.length === 0 ? (
            <Text className="text-sm text-fg-muted">
              Nothing yet. Add money whenever you like — any amount, no schedule.
            </Text>
          ) : (
            <View className="gap-3">
              {history.map((entry) => (
                <View
                  key={`${entry.kind}-${entry.id}`}
                  className="flex-row items-center gap-2.5"
                >
                  <Icon
                    name={
                      entry.kind === "spend"
                        ? "cart"
                        : entry.amountMinor >= 0
                          ? "plus"
                          : "chevron-down"
                    }
                    size={15}
                    color={
                      entry.kind === "spend"
                        ? colors.danger
                        : entry.amountMinor >= 0
                          ? colors.success
                          : colors.fgMuted
                    }
                  />
                  <View className="flex-1">
                    <Text className="text-sm text-fg">
                      {entry.kind === "spend"
                        ? (entry.description?.trim() || "Spent from this fund")
                        : entry.note?.trim() ||
                          (entry.amountMinor >= 0 ? "Added" : "Released")}
                    </Text>
                    <Text className="text-[11px] text-fg-subtle">
                      {entry.date.toLocaleDateString(undefined, {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </Text>
                  </View>
                  <Text
                    className={`font-data text-sm font-medium tabular-nums ${
                      entry.kind === "spend"
                        ? "text-danger"
                        : entry.amountMinor >= 0
                          ? "text-success"
                          : "text-fg-muted"
                    }`}
                  >
                    {entry.kind === "spend"
                      ? `−${formatMoney(entry.amountMinor, entry.currency)}`
                      : `${entry.amountMinor >= 0 ? "+" : "−"}${formatMoney(Math.abs(entry.amountMinor), baseCurrency)}`}
                  </Text>
                  {entry.kind === "allocation" && (
                    <Pressable
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel="Delete entry"
                      onPress={() =>
                        Alert.alert("Remove this entry?", "This can't be undone.", [
                          { text: "Cancel", style: "cancel" },
                          {
                            text: "Remove",
                            style: "destructive",
                            onPress: () => deleteFundAllocation(entry.id),
                          },
                        ])
                      }
                    >
                      <Icon name="trash-can-outline" size={14} color={colors.fgSubtle} />
                    </Pressable>
                  )}
                </View>
              ))}
            </View>
          )}
          <Text className="mt-3 text-[11px] text-fg-subtle">
            Spending shown here is the real transaction — edit or delete it from the transaction
            itself and this fund updates to match.
          </Text>
        </View>

        <View className="gap-2">
          {isClosed ? (
            <Pressable
              onPress={() => reopenFund(fundId)}
              className="items-center rounded-full border border-glass-border bg-glass py-3"
            >
              <Text className="text-base font-semibold text-fg">Reopen fund</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={handleClose}
              className="items-center rounded-full bg-transfer-soft py-3"
            >
              <Text className="text-base font-semibold text-transfer">Close fund</Text>
            </Pressable>
          )}
          <Pressable onPress={handleDelete} className="items-center rounded-full py-3">
            <Text className="text-sm font-medium text-danger">Delete fund</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Mounted only while open so each open starts with fresh fields. */}
      {sheetMode !== null && (
        <FundAllocationSheet
          mode={sheetMode}
          fundName={fund.name}
          fundedMinor={balance.fundedMinor}
          baseCurrency={baseCurrency}
          onClose={() => setSheetMode(null)}
          onSubmit={handleAllocate}
        />
      )}
    </View>
  );
}
