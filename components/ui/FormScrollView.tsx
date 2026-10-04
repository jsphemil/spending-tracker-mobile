import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface FormScrollViewProps {
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

// The one scroll container every form uses (spec.md §5.19 "Keyboard
// handling", 2026-09-15). This app runs edge-to-edge, where Android no
// longer resizes the window for the keyboard, so a plain ScrollView let the
// keyboard paint over whatever field was near the bottom — Description and
// Tags on New Transaction, most visibly. KeyboardAwareScrollView tracks the
// keyboard frame by frame and keeps the focused input bottomOffset above
// it, including when focus moves between fields with the keyboard up.
//
// Defaults chosen here so every form behaves the same:
//   • keyboardShouldPersistTaps="handled" — a chip or the Save button acts
//     on the first tap while the keyboard is open, instead of the tap only
//     dismissing it.
//   • keyboardDismissMode="on-drag" — a swipe closes the keyboard, so the
//     covered area can always be revealed by hand as well.
//   • the bottom safe-area inset added to the caller's padding. Edge-to-edge
//     means Android paints the navigation bar over the window, and with
//     3-button navigation that bar is ~48dp — enough to sit on top of the
//     submit button at the end of every form (reported 2026-10-04).
export function FormScrollView({ children, contentContainerStyle }: FormScrollViewProps) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAwareScrollView
      className="flex-1 bg-bg"
      // Last, so paddingBottom wins over the callers' `padding` shorthand.
      contentContainerStyle={[contentContainerStyle, { paddingBottom: insets.bottom + 16 }]}
      bottomOffset={24}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      {children}
    </KeyboardAwareScrollView>
  );
}
