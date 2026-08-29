import React, { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import type { WidgetConfigurationScreenProps } from "react-native-android-widget";

import { saveWidgetAccountSelection } from "../db/actions/widgetConfig";
import { useAccounts } from "../db/queries/accounts";
import { getAccountBalanceMinor } from "../services/balance";
import { formatMoney } from "../services/format";
import { db } from "../db/client";
import { buildAccountsWidget } from "./widget-task-handler";

// Rendered by react-native-android-widget in its own Activity when the
// widget is first added (widgetFeatures: "reconfigurable" in app.json) —
// a separate React root from the main app's, so this deliberately uses
// plain React Native components + inline styles instead of NativeWind
// (which needs the CSS-variable context app/_layout.tsx sets up, not
// present here) or the app's own theme/palette.ts hooks.
const COLORS = {
  bg: "#0c1120",
  surface: "#131a2c",
  surface2: "#1a2338",
  border: "#1f2432",
  fg: "#f6f8fc",
  fgMuted: "#97a1bc",
  accent: "#48e7f5",
};

export function AccountsWidgetConfigScreen({ widgetInfo, renderWidget, setResult }: WidgetConfigurationScreenProps) {
  const { data: accounts } = useAccounts();
  const [selected, setSelected] = useState<Set<number>>(new Set());

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSave() {
    const ids = Array.from(selected);
    saveWidgetAccountSelection(widgetInfo.widgetId, ids);
    renderWidget(buildAccountsWidget(widgetInfo.widgetId));
    setResult("ok");
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg, paddingTop: 48 }}>
      <Text style={{ color: COLORS.fg, fontSize: 20, fontWeight: "700", paddingHorizontal: 20, marginBottom: 4 }}>
        Choose accounts
      </Text>
      <Text style={{ color: COLORS.fgMuted, fontSize: 13, paddingHorizontal: 20, marginBottom: 16 }}>
        Pick any number of accounts to show on this widget.
      </Text>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
        {(accounts ?? []).map((acct) => {
          const isSelected = selected.has(acct.id);
          const balanceText = formatMoney(getAccountBalanceMinor(db, acct.id), acct.currency);
          return (
            <Pressable
              key={acct.id}
              onPress={() => toggle(acct.id)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: COLORS.surface,
                borderWidth: 1,
                borderColor: isSelected ? COLORS.accent : COLORS.border,
                borderRadius: 12,
                paddingVertical: 12,
                paddingHorizontal: 14,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 6,
                    borderWidth: 2,
                    borderColor: isSelected ? COLORS.accent : COLORS.fgMuted,
                    backgroundColor: isSelected ? COLORS.accent : "transparent",
                  }}
                />
                <Text style={{ color: COLORS.fg, fontSize: 15, fontWeight: "500", flexShrink: 1 }} numberOfLines={1}>
                  {acct.name}
                </Text>
              </View>
              <Text style={{ color: COLORS.fgMuted, fontSize: 14 }}>{balanceText}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={{ padding: 20 }}>
        <Pressable
          onPress={handleSave}
          style={{
            backgroundColor: COLORS.accent,
            borderRadius: 14,
            paddingVertical: 14,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#0a0e1a", fontSize: 16, fontWeight: "700" }}>Save</Text>
        </Pressable>
      </View>
    </View>
  );
}
