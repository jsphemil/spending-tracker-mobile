package expo.modules.widgetbridge

import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver

// New widget, independent of AccountsGlanceWidgetReceiver and
// QuickAddGlanceWidgetReceiver -- no config screen and no per-instance
// state, since it always shows the whole portfolio.
class CashFlowGlanceWidgetReceiver : GlanceAppWidgetReceiver() {
  override val glanceAppWidget: GlanceAppWidget = CashFlowGlanceWidget()
}
