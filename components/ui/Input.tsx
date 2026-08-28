import { useState } from "react";
import { TextInput, type TextInputProps } from "react-native";

import { useThemeColors } from "../../theme/palette";

// Drop-in replacement for a raw <TextInput> — same props, same className-
// driven glass styling every form already uses, plus the design system's
// focus state: border and glow shift to cyan (accent) while focused. Kept
// as a thin wrapper (not a full label+field component) so every call site
// only needs to swap the tag name, not restructure its surrounding label
// markup, error text, or flex layout.
export function Input({ className, style, onFocus, onBlur, ...props }: TextInputProps & { className?: string }) {
  const colors = useThemeColors();
  const [focused, setFocused] = useState(false);

  return (
    <TextInput
      placeholderTextColor={colors.fgSubtle}
      {...props}
      className={className}
      style={[
        focused
          ? {
              borderColor: colors.accent,
              shadowColor: colors.accent,
              shadowOpacity: 0.35,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 0 },
              elevation: 4,
            }
          : null,
        style,
      ]}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
    />
  );
}
