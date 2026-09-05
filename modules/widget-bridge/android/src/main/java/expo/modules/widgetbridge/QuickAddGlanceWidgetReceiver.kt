package expo.modules.widgetbridge

import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver

// New widget, independent of AccountsGlanceWidgetReceiver -- no config
// screen and no legacy SQLite selection to migrate/clean up, since this
// widget stores no per-instance state at all.
class QuickAddGlanceWidgetReceiver : GlanceAppWidgetReceiver() {
  override val glanceAppWidget: GlanceAppWidget = QuickAddGlanceWidget()
}
