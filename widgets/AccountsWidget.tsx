import React from "react";
import { FlexWidget, TextWidget } from "react-native-android-widget";
import type { HexColor } from "react-native-android-widget";

import { WIDGET_ACCENT, WIDGET_ICON_STROKE, type WidgetColors } from "./theme";

export interface AccountsWidgetAccount {
  id: number;
  name: string;
  balanceText: string;
}

export interface AccountsWidgetProps {
  accounts: AccountsWidgetAccount[];
  colors: WidgetColors;
}

const DEEP_LINK_BASE = "spendingtracker://transaction/new";

function ActionPill({
  label,
  accent,
  type,
}: {
  label: string;
  accent: HexColor;
  type: "income" | "expense" | "transfer";
}) {
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: `${DEEP_LINK_BASE}?type=${type}` }}
      style={{
        flex: 1,
        height: 40,
        borderRadius: 20,
        backgroundColor: accent,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <TextWidget text={`+ ${label}`} style={{ fontSize: 13, fontWeight: "700", color: WIDGET_ICON_STROKE }} />
    </FlexWidget>
  );
}

// No accounts selected yet (widget just added, configuration not
// finished) or every selected account was since deleted.
function EmptyState({ colors }: { colors: WidgetColors }) {
  return (
    <TextWidget
      text="Tap to choose accounts"
      style={{ fontSize: 13, color: colors.textSecondary, textAlign: "center" }}
    />
  );
}

export function AccountsWidget({ accounts, colors }: AccountsWidgetProps) {
  return (
    <FlexWidget
      clickAction={accounts.length === 0 ? "OPEN_APP" : undefined}
      style={{
        width: "match_parent",
        height: "wrap_content",
        backgroundColor: colors.cardBg,
        borderRadius: 24,
        padding: 16,
        flexDirection: "column",
      }}
    >
      {accounts.length === 0 ? (
        <EmptyState colors={colors} />
      ) : (
        <FlexWidget style={{ width: "match_parent", flexDirection: "column" }}>
          {accounts.map((acct, i) => (
            <FlexWidget key={acct.id} style={{ width: "match_parent", flexDirection: "column" }}>
              {i > 0 && <FlexWidget style={{ width: "match_parent", height: 1, backgroundColor: colors.border }} />}
              <FlexWidget
                style={{
                  width: "match_parent",
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingVertical: 7,
                }}
              >
                <FlexWidget style={{ flex: 1 }}>
                  <TextWidget
                    text={acct.name}
                    truncate="END"
                    maxLines={1}
                    style={{ fontSize: 15, fontWeight: "600", color: colors.textPrimary }}
                  />
                </FlexWidget>
                <TextWidget
                  text={acct.balanceText}
                  style={{ fontSize: 16, fontWeight: "700", color: WIDGET_ACCENT.cyan, marginLeft: 12 }}
                />
              </FlexWidget>
            </FlexWidget>
          ))}
        </FlexWidget>
      )}

      <FlexWidget
        style={{ width: "match_parent", height: 1, backgroundColor: colors.dividerStrong, marginTop: 6, marginBottom: 12 }}
      />

      <FlexWidget style={{ width: "match_parent", flexDirection: "row", flexGap: 8 }}>
        <ActionPill label="Income" accent={WIDGET_ACCENT.cyan} type="income" />
        <ActionPill label="Expense" accent={WIDGET_ACCENT.blue} type="expense" />
        <ActionPill label="Transfer" accent={WIDGET_ACCENT.violet} type="transfer" />
      </FlexWidget>
    </FlexWidget>
  );
}
