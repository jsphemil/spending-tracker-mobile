import { requestWidgetUpdate } from "react-native-android-widget";

import { buildAccountsWidget } from "./widget-task-handler";

// Called after any write that could change a shown account's balance
// (transaction create/update/delete, account create/update/delete) so
// the "Accounts & Quick Add" widget updates immediately instead of
// waiting for Android's 30-minute scheduled refresh (app.json's
// updatePeriodMillis, a library/OS-level minimum, not a design choice).
// Fire-and-forget — a widget refresh failing must never break the
// actual data write it's reacting to.
export function refreshAccountsWidget(): void {
  requestWidgetUpdate({
    widgetName: "Accounts",
    renderWidget: (info) => buildAccountsWidget(info.widgetId),
  }).catch(() => {});
}
