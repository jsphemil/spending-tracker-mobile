import { useRef, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AmountOperatorRow } from "./AmountOperatorRow";
import { evaluateExpression } from "../services/calculator";
import { currencySymbol, formatMoney, majorToMinor } from "../services/format";
import { useThemeColors } from "../theme/palette";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";

export type AllocationMode = "add" | "release";

interface FundAllocationSheetProps {
  mode: AllocationMode;
  fundName: string;
  /** What's currently earmarked — the ceiling for a release. */
  fundedMinor: number;
  baseCurrency: string;
  onClose: () => void;
  /** Always positive; the caller applies the sign. */
  onSubmit: (amountMinor: number, note: string | null) => void;
}

// Bottom-sheet-shaped bare Modal, matching CurrencyPicker and the header's
// InfoModal — this app has no sheet library, and DESIGN.md §5.18 records
// that deliberately.
//
// The caller mounts this only while it's open rather than toggling a
// `visible` prop, so every open starts with empty fields and a cleared
// submit guard for free. Resetting them in an effect instead would fire a
// cascading render on each open.
export function FundAllocationSheet({
  mode,
  fundName,
  fundedMinor,
  baseCurrency,
  onClose,
  onSubmit,
}: FundAllocationSheetProps) {
  const colors = useThemeColors();
  const [amountText, setAmountText] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Same double-tap guard as TransactionForm — a duplicate allocation is
  // exactly as wrong as the duplicate transactions that guard was written
  // for, and this sheet's button stays pressable until the parent closes it.
  const submittingRef = useRef(false);

  const isRelease = mode === "release";

  function handleSubmit() {
    const amount = evaluateExpression(amountText);
    if (amount === null) {
      setError("Enter a valid amount or expression (e.g. 5000+500)");
      return;
    }
    if (amount <= 0) {
      setError("Amount must be greater than 0");
      return;
    }
    const amountMinor = majorToMinor(amount, baseCurrency);
    // Enforced here rather than in db/actions/funds.ts, which can't compute
    // the funded figure without the screen's currency converter.
    if (isRelease && amountMinor > fundedMinor) {
      setError(`You can release at most ${formatMoney(fundedMinor, baseCurrency)}`);
      return;
    }
    setError(null);

    if (submittingRef.current) return;
    submittingRef.current = true;
    onSubmit(amountMinor, note.trim() || null);
  }

  return (
    <Modal visible animationType="slide" onRequestClose={onClose} transparent>
      <Pressable className="flex-1 justify-end bg-black/50" onPress={onClose}>
        <Pressable className="rounded-t-3xl bg-bg" onPress={(e) => e.stopPropagation()}>
          <SafeAreaView edges={["bottom"]}>
            <View className="gap-5 p-5">
              <View className="gap-1">
                <Text className="text-lg font-display-xbold text-fg">
                  {isRelease ? "Release from fund" : "Add to fund"}
                </Text>
                <Text className="text-sm text-fg-muted">
                  {isRelease
                    ? `Returns money from ${fundName} to your unallocated wealth. Your net worth doesn't change.`
                    : `Earmarks money for ${fundName}. Nothing moves between accounts and your net worth doesn't change.`}
                </Text>
              </View>

              <View className="gap-2">
                <Text className="text-sm font-medium text-fg-muted">
                  Amount ({currencySymbol(baseCurrency).trim()})
                </Text>
                <Input
                  value={amountText}
                  onChangeText={setAmountText}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  autoFocus
                  placeholderTextColor={colors.fgSubtle}
                  className="font-data rounded-lg border border-glass-border bg-glass px-3 py-2 text-lg text-fg"
                />
                <AmountOperatorRow value={amountText} onChange={setAmountText} />
                {isRelease && (
                  <Text className="text-xs text-fg-subtle">
                    Currently earmarked: {formatMoney(fundedMinor, baseCurrency)}
                  </Text>
                )}
              </View>

              <View className="gap-2">
                <Text className="text-sm font-medium text-fg-muted">Note (optional)</Text>
                <Input
                  value={note}
                  onChangeText={setNote}
                  placeholder={isRelease ? "e.g. Needed it elsewhere" : "e.g. Diwali bonus"}
                  placeholderTextColor={colors.fgSubtle}
                  className="rounded-lg border border-glass-border bg-glass px-3 py-2 text-base text-fg"
                />
              </View>

              {error && <Text className="text-sm text-danger">{error}</Text>}

              <View className="gap-2">
                <Button onPress={handleSubmit} variant={isRelease ? "transfer" : "primary"}>
                  {isRelease ? "Release" : "Add to fund"}
                </Button>
                <Button onPress={onClose} variant="ghost">
                  Cancel
                </Button>
              </View>
            </View>
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
