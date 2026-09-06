import WidgetBridgeModule from "../modules/widget-bridge/src/WidgetBridgeModule";

// Called after any write that could change a shown account's balance
// (transaction create/update/delete, account create/update/delete) so
// the "Accounts & Quick Add" widget updates immediately instead of
// waiting for Android's 30-minute scheduled refresh.
// Fire-and-forget — a widget refresh failing must never break the
// actual data write it's reacting to.
export function refreshAccountsWidget(): void {
  WidgetBridgeModule.refreshAccountsWidget().catch(() => {});
  // Same trigger set also invalidates the whole-portfolio widgets
  // (Monthly Cash Flow, and later Net Worth) -- they have no config of
  // their own, so any write that could move a balance is exactly what
  // they need to hear about too. A separate native function
  // (refreshPortfolioWidgets), not folded into the call above, so the
  // existing Accounts widget's own refresh path is untouched.
  WidgetBridgeModule.refreshPortfolioWidgets().catch(() => {});
}
