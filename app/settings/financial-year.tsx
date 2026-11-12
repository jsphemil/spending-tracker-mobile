import { Pressable, Text, View } from "react-native";

import { ScreenScrollView } from "../../components/ui/ScreenScrollView";
import { updateSettings } from "../../db/actions/settings";
import { useSettings } from "../../db/queries/settings";
import { financialYear } from "../../services/period";

const MONTHS = Array.from({ length: 12 }, (_, i) =>
  new Date(2000, i, 1).toLocaleDateString(undefined, { month: "long" }),
);

// The month the user's financial year starts in (5.0.0). Used by Analytics'
// "This FY / Last FY" shortcuts and by yearly category budgets.
export default function FinancialYearSettingsScreen() {
  const { settings } = useSettings();
  if (!settings) return null;
  const current = financialYear(new Date(), settings.fyStartMonth);

  return (
    <ScreenScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
      <Text className="mb-2 text-sm text-fg-muted">
        Your financial year starts in the month you pick. Today is in {current.label}. Yearly category budgets and
        Analytics&rsquo; FY shortcuts use it.
      </Text>
      {MONTHS.map((name, i) => {
        const month = i + 1;
        const selected = settings.fyStartMonth === month;
        return (
          <Pressable
            key={month}
            onPress={() => updateSettings(settings.id, { fyStartMonth: month })}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            className={`flex-row items-center justify-between rounded-2xl border px-4 py-3.5 ${
              selected ? "border-accent bg-accent-soft" : "border-glass-border bg-glass"
            }`}
          >
            <View>
              <Text className="text-base text-fg">{name}</Text>
              {month === 4 && <Text className="text-xs text-fg-muted">India (April to March)</Text>}
              {month === 1 && <Text className="text-xs text-fg-muted">Calendar year</Text>}
            </View>
            {selected && <Text className="text-accent">✓</Text>}
          </Pressable>
        );
      })}
    </ScreenScrollView>
  );
}
