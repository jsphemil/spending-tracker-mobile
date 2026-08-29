import React from "react";
import type { WidgetRepresentation, WidgetTaskHandlerProps } from "react-native-android-widget";

import { deleteWidgetAccountSelection, getWidgetAccountConfig } from "../db/actions/widgetConfig";
import { currentMonthPeriod, monthLabel } from "../services/period";
import { AccountsWidget } from "./AccountsWidget";
import { getAccountsWidgetData } from "./data";
import { getWidgetColors } from "./theme";

export function buildAccountsWidget(widgetId: number): WidgetRepresentation {
  const { accountIds, opacityPct } = getWidgetAccountConfig(widgetId);
  const accounts = getAccountsWidgetData(accountIds);
  const label = monthLabel(currentMonthPeriod());
  return {
    light: <AccountsWidget accounts={accounts} colors={getWidgetColors(false, opacityPct)} monthLabel={label} />,
    dark: <AccountsWidget accounts={accounts} colors={getWidgetColors(true, opacityPct)} monthLabel={label} />,
  };
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  if (props.widgetInfo.widgetName !== "Accounts") return;

  switch (props.widgetAction) {
    case "WIDGET_ADDED":
    case "WIDGET_UPDATE":
    case "WIDGET_RESIZED":
      props.renderWidget(buildAccountsWidget(props.widgetInfo.widgetId));
      break;
    case "WIDGET_DELETED":
      deleteWidgetAccountSelection(props.widgetInfo.widgetId);
      break;
    default:
      break;
  }
}
