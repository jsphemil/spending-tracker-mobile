package expo.modules.widgetbridge

import androidx.glance.appwidget.state.updateAppWidgetState
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.runBlocking

class WidgetBridgeModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("WidgetBridge")

    // Called from JS after any write that could move a shown balance.
    //
    // Bumping the data version is the point of this, not an extra: the
    // account ids the widget shows are unchanged by a new transaction, so
    // nothing the composition reads would differ and a bare update() would
    // recompose to a byte-identical result. Writing the version into the
    // widget's Glance state invalidates the composition, which re-runs the
    // SQLite read behind it and picks up the new balances.
    AsyncFunction("refreshAccountsWidget") {
      appContext.reactContext?.let { context ->
        runBlocking {
          // Straight from AppWidgetManager rather than
          // GlanceAppWidgetManager.getGlanceIds(), which can return an
          // empty list until the receiver has handled its first update.
          boundAppWidgetIds(context).forEach { appWidgetId ->
            val glanceId = glanceIdFor(context, appWidgetId)
            updateAppWidgetState(context, glanceId) { prefs -> prefs.bumpDataVersion() }
            AccountsGlanceWidget().update(context, glanceId)
          }
        }
      }
    }
  }
}
