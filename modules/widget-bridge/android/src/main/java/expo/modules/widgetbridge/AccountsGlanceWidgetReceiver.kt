package expo.modules.widgetbridge

import android.content.Context
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver

class AccountsGlanceWidgetReceiver : GlanceAppWidgetReceiver() {
  override val glanceAppWidget: GlanceAppWidget = AccountsGlanceWidget()

  // Glance deletes each widget's own state store itself (via
  // GlanceAppWidget.onDelete), so this only clears the pre-migration
  // SQLite rows — see WidgetConfigStore.kt.
  override fun onDeleted(context: Context, appWidgetIds: IntArray) {
    super.onDeleted(context, appWidgetIds)
    appWidgetIds.forEach { deleteLegacyWidgetConfig(context, it) }
  }
}
