import { Pressable, Text, View } from "react-native";

const OPERATORS = [
  { symbol: "+", char: "+" },
  { symbol: "−", char: "-" },
  { symbol: "×", char: "*" },
  { symbol: "÷", char: "/" },
] as const;

interface AmountOperatorRowProps {
  value: string;
  onChange: (next: string) => void;
}

// None of React Native's numeric keyboardType values (numeric, decimal-pad,
// number-pad) show operator symbols on-screen, even though the amount
// fields accept math expressions (services/calculator.ts) — these buttons
// are the only way to actually type "+"/"-"/"*"/"/" without manually
// switching to a full alphanumeric keyboard.
export function AmountOperatorRow({ value, onChange }: AmountOperatorRowProps) {
  return (
    <View className="flex-row gap-2">
      {OPERATORS.map((op) => (
        <Pressable
          key={op.char}
          onPress={() => onChange(value + op.char)}
          className="flex-1 items-center rounded-lg border border-glass-border bg-glass py-2"
        >
          <Text className="font-data text-base text-fg">{op.symbol}</Text>
        </Pressable>
      ))}
    </View>
  );
}
