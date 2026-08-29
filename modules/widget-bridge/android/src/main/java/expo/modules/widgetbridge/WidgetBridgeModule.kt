package expo.modules.widgetbridge

import androidx.glance.appwidget.updateAll
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.runBlocking

class WidgetBridgeModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("WidgetBridge")

    AsyncFunction("refreshAccountsWidget") {
      appContext.reactContext?.let { context ->
        runBlocking { AccountsGlanceWidget().updateAll(context) }
      }
    }
  }
}
