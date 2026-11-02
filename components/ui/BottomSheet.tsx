import type { ReactNode } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface BottomSheetProps {
  title?: string;
  onClose: () => void;
  children: ReactNode;
  /** Tailwind max-height class for the sheet body, e.g. "max-h-[75%]". */
  maxHeightClassName?: string;
}

// Shared chrome for the hand-rolled bottom-sheet recipe already repeated
// across AccountSwitcherSheet/FundAllocationSheet/TransactionFilterSheet/
// WhatsNewSheet (bare Modal, backdrop Pressable, rounded-top sheet,
// SafeAreaView edges=["bottom"]). DESIGN.md §5.18 records a deliberate
// decision against a *sheet library* — this isn't one, it's just not
// copy-pasting the same ~15 lines a 6th time for the New Transaction
// redesign's 5 new sheets. Those 5 existing sheets are left as-is.
//
// Mounted only while open (same convention as every sheet above), so
// there's nothing to reset between opens — the caller renders this
// conditionally rather than toggling a `visible` prop.
export function BottomSheet({ title, onClose, children, maxHeightClassName = "max-h-[75%]" }: BottomSheetProps) {
  return (
    <Modal visible animationType="slide" onRequestClose={onClose} transparent>
      <Pressable className="flex-1 justify-end bg-black/50" onPress={onClose}>
        <Pressable className={`${maxHeightClassName} rounded-t-3xl bg-bg`} onPress={(e) => e.stopPropagation()}>
          <SafeAreaView edges={["bottom"]} className="flex-shrink">
            <View className="items-center pt-3">
              <View className="h-1 w-10 rounded-full bg-border-strong" />
            </View>
            {title && (
              <Text className="px-5 pb-2 pt-3 font-display text-lg text-fg">{title}</Text>
            )}
            {children}
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
