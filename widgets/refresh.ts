import WidgetBridgeModule from "../modules/widget-bridge/src/WidgetBridgeModule";

// Called after any write that could change a shown account's balance
// (transaction create/update/delete, account create/update/delete) so
// the "Accounts & Quick Add" widget updates immediately instead of
// waiting for Android's 30-minute scheduled refresh.
// Fire-and-forget — a widget refresh failing must never break the
// actual data write it's reacting to.
export function refreshAccountsWidget(): void {
  WidgetBridgeModule.refreshAccountsWidget().catch(() => {});
}
