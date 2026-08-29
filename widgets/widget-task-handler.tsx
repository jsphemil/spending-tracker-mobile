import React from "react";
import type { WidgetRepresentation, WidgetTaskHandlerProps } from "react-native-android-widget";

import { deleteWidgetAccountSelection, getWidgetAccountSelection } from "../db/actions/widgetConfig";
import { AccountsWidget } from "./AccountsWidget";
import { getAccountsWidgetData } from "./data";
import { WIDGET_DARK, WIDGET_LIGHT } from "./theme";

export function buildAccountsWidget(widgetId: number): WidgetRepresentation {
  const accountIds = getWidgetAccountSelection(widgetId);
  const accounts = getAccountsWidgetData(accountIds);
  return {
    light: <AccountsWidget accounts={accounts} colors={WIDGET_LIGHT} />,
    dark: <AccountsWidget accounts={accounts} colors={WIDGET_DARK} />,
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
