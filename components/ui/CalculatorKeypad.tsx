import { Pressable, Text, View } from "react-native";

import { Icon } from "./Icon";
import { useThemeColors } from "../../theme/palette";

interface CalculatorKeypadProps {
  value: string;
  onChange: (next: string) => void;
  /** 0 for zero-decimal currencies (JPY/KRW/VND) — disables the "." key. */
  minorUnits: number;
  onAct: () => void;
  actLabel: string;
  /** true while an expression with a pending operator is open — renders "=" styling on the act key. */
  actIsEquals: boolean;
  onHide: () => void;
}

const OP_CHARS = ["+", "-", "*", "/"] as const;
const OP_SYMBOLS: Record<(typeof OP_CHARS)[number], string> = { "+": "+", "-": "−", "*": "×", "/": "÷" };

function isOperator(ch: string): boolean {
  return (OP_CHARS as readonly string[]).includes(ch);
}

// The segment of the expression after the last operator — the "current
// number being typed" that digit/decimal caps apply to.
function lastSegment(expr: string): string {
  const parts = expr.split(/[+\-*/]/);
  return parts[parts.length - 1];
}

function appendDigit(expr: string, key: string): string {
  const seg = lastSegment(expr);
  if (seg === "0") {
    // No leading extra zeros: "0"+"0"/"00" is a no-op, "0"+"5" replaces the
    // lone leading zero instead of producing "05".
    if (key === "0" || key === "00") return expr;
    return expr.slice(0, -1) + key;
  }
  // "00" on an empty number behaves as a single "0".
  return expr + (key === "00" && seg === "" ? "0" : key);
}

// Module-scope, not a component defined inside CalculatorKeypad's render —
// a key always takes an explicit onPress rather than defaulting to a
// closure over local `press`/`value`, so this component's identity (and
// its internal Pressable state) stays stable across re-renders.
function Key({
  label,
  accessibilityLabel,
  variant = "digit",
  onPress,
  onLongPress,
  style,
}: {
  label: string;
  accessibilityLabel: string;
  variant?: "digit" | "op" | "fn";
  onPress: () => void;
  onLongPress?: () => void;
  style?: object;
}) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[{ flex: 1 }, style]}
      className={`items-center justify-center rounded-lg ${
        variant === "op" ? "bg-accent-soft" : variant === "fn" ? "bg-glass" : "bg-surface"
      }`}
    >
      <Text className={`text-xl font-medium ${variant === "op" ? "text-accent" : "text-fg"}`}>{label}</Text>
    </Pressable>
  );
}

export function CalculatorKeypad({
  value,
  onChange,
  minorUnits,
  onAct,
  actLabel,
  actIsEquals,
  onHide,
}: CalculatorKeypadProps) {
  const colors = useThemeColors();

  function press(key: string) {
    const seg = lastSegment(value);
    if (/^[0-9]$/.test(key) || key === "00") {
      if (seg.includes(".") && minorUnits > 0 && seg.split(".")[1].length >= minorUnits) return;
      if (seg.includes(".") && minorUnits === 0) return;
      onChange(appendDigit(value, key));
      return;
    }
    if (key === ".") {
      if (minorUnits === 0 || seg.includes(".")) return;
      onChange(value + (seg === "" ? "0." : "."));
      return;
    }
    if (isOperator(key)) {
      if (!value) return; // no leading operator
      let next = value;
      if (next.endsWith(".")) next = next.slice(0, -1);
      if (isOperator(next.slice(-1))) next = next.slice(0, -1);
      onChange(next + key);
      return;
    }
    if (key === "back") {
      onChange(value.slice(0, -1));
      return;
    }
    if (key === "C") {
      onChange("");
    }
  }

  return (
    <View className="gap-1.5 rounded-t-2xl bg-surface-2 p-2" style={{ height: 272 }}>
      <View className="h-7 flex-row items-center justify-between px-1">
        <Text className="text-xs text-fg-muted">Type an amount or a sum like 450 + 120</Text>
        <Pressable onPress={onHide} accessibilityRole="button" accessibilityLabel="Hide keypad" hitSlop={8}>
          <Icon name="chevron-down" size={18} color={colors.fgMuted} />
        </Pressable>
      </View>
      <View className="flex-1 flex-row gap-1.5">
        <View className="flex-[3] gap-1.5">
          <View className="flex-1 flex-row gap-1.5">
            <Key label="C" accessibilityLabel="Clear" variant="fn" onPress={() => press("C")} />
            <Key label={OP_SYMBOLS["/"]} accessibilityLabel="Divide" variant="op" onPress={() => press("/")} />
            <Key label={OP_SYMBOLS["*"]} accessibilityLabel="Multiply" variant="op" onPress={() => press("*")} />
          </View>
          <View className="flex-1 flex-row gap-1.5">
            <Key label="7" accessibilityLabel="7" onPress={() => press("7")} />
            <Key label="8" accessibilityLabel="8" onPress={() => press("8")} />
            <Key label="9" accessibilityLabel="9" onPress={() => press("9")} />
          </View>
          <View className="flex-1 flex-row gap-1.5">
            <Key label="4" accessibilityLabel="4" onPress={() => press("4")} />
            <Key label="5" accessibilityLabel="5" onPress={() => press("5")} />
            <Key label="6" accessibilityLabel="6" onPress={() => press("6")} />
          </View>
          <View className="flex-1 flex-row gap-1.5">
            <Key label="1" accessibilityLabel="1" onPress={() => press("1")} />
            <Key label="2" accessibilityLabel="2" onPress={() => press("2")} />
            <Key label="3" accessibilityLabel="3" onPress={() => press("3")} />
          </View>
          <View className="flex-1 flex-row gap-1.5">
            <Key label="00" accessibilityLabel="Double zero" onPress={() => press("00")} />
            <Key label="0" accessibilityLabel="0" onPress={() => press("0")} />
            <Key label="." accessibilityLabel="Decimal point" onPress={() => press(".")} />
          </View>
        </View>
        <View className="flex-1 gap-1.5">
          <Key
            label="⌫"
            accessibilityLabel="Backspace"
            variant="fn"
            style={{ flex: 1 }}
            onPress={() => press("back")}
            onLongPress={() => press("C")}
          />
          <Key label={OP_SYMBOLS["-"]} accessibilityLabel="Minus" variant="op" style={{ flex: 1 }} onPress={() => press("-")} />
          <Key label={OP_SYMBOLS["+"]} accessibilityLabel="Plus" variant="op" style={{ flex: 1 }} onPress={() => press("+")} />
          <Pressable
            onPress={onAct}
            accessibilityRole="button"
            accessibilityLabel={actLabel}
            style={{ flex: 2 }}
            className="items-center justify-center rounded-lg bg-accent-fill"
          >
            <Text className={`font-semibold text-on-accent ${actIsEquals ? "text-2xl" : "text-sm"}`}>{actLabel}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
