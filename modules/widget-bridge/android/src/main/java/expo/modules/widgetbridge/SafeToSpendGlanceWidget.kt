package expo.modules.widgetbridge

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.produceState
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.datastore.preferences.core.Preferences
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.LocalSize
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.SizeMode
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.lazy.LazyColumn
import androidx.glance.appwidget.lazy.items
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.currentState
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.layout.size
import androidx.glance.layout.width
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

// "Safe to Spend" — every account that counts toward Safe to Spend (the
// per-account toggle in the app, shared with the Dashboard card), each
// one's per-day figure, and the combined total in base currency. No
// per-widget configuration: which accounts count is the app's setting.
// Same dark palette as AccountsGlanceWidget. Tapping opens the app.
class SafeToSpendGlanceWidget : GlanceAppWidget() {
  override val sizeMode = SizeMode.Exact

  override suspend fun provideGlance(context: Context, id: GlanceId) {
    val openApp = context.packageManager.getLaunchIntentForPackage(context.packageName)
      ?: Intent(Intent.ACTION_VIEW, Uri.parse("spendingtracker://"))

    provideContent {
      // Bumped by WidgetBridgeModule.refreshAccountsWidget after any write.
      val dataVersion = currentState<Preferences>()[KEY_DATA_VERSION] ?: 0
      val data by produceState<SafeToSpendData?>(null, dataVersion) {
        value = withContext(Dispatchers.IO) { getSafeToSpendForWidget(context) }
      }
      Content(data, openApp)
    }
  }

  @Composable
  private fun Content(data: SafeToSpendData?, openApp: Intent) {
    val compact = LocalSize.current.height < 150.dp
    Column(
      modifier = GlanceModifier
        .fillMaxSize()
        .cornerRadius(24.dp)
        .background(CARD_BG)
        .padding(16.dp)
        .clickable(actionStartActivity(openApp)),
    ) {
      Text("Safe to spend today", style = TextStyle(fontSize = 12.sp, color = ColorProvider(TEXT_SECONDARY)))
      when {
        data == null -> Text(
          "Open Erebor to load",
          style = TextStyle(fontSize = 14.sp, color = ColorProvider(TEXT_PRIMARY)),
          modifier = GlanceModifier.padding(top = 6.dp),
        )
        data.rows.isEmpty() -> Text(
          "No accounts counted — turn on \"Count toward Safe to Spend\" on an account",
          style = TextStyle(fontSize = 13.sp, color = ColorProvider(TEXT_PRIMARY)),
          modifier = GlanceModifier.padding(top = 6.dp),
        )
        else -> {
          Text(
            formatMoney(data.totalBaseMinor, data.baseCurrency),
            style = TextStyle(fontSize = 28.sp, fontWeight = FontWeight.Bold, color = ColorProvider(TEXT_PRIMARY)),
          )
          val days = if (data.daysRemaining == 1) "1 day" else "${data.daysRemaining} days"
          Text(
            "per day · $days left" + if (data.hasUnconverted) " · some currencies not converted" else "",
            style = TextStyle(fontSize = 11.sp, color = ColorProvider(TEXT_SUBTLE)),
          )
          if (!compact && data.rows.size > 1) {
            Spacer(GlanceModifier.height(10.dp))
            LazyColumn(modifier = GlanceModifier.fillMaxWidth()) {
              items(data.rows, itemId = { it.id }) { row ->
                Row(
                  modifier = GlanceModifier.fillMaxWidth().padding(vertical = 5.dp),
                  verticalAlignment = Alignment.CenterVertically,
                ) {
                  Box(modifier = GlanceModifier.size(8.dp).cornerRadius(4.dp).background(parseColor(row.colorHex))) {}
                  Spacer(GlanceModifier.width(8.dp))
                  Text(
                    row.name,
                    maxLines = 1,
                    style = TextStyle(fontSize = 13.sp, color = ColorProvider(TEXT_PRIMARY)),
                    modifier = GlanceModifier.defaultWeight(),
                  )
                  Text(
                    if (row.perDayMinor > 0) formatMoney(row.perDayMinor, row.currency) else "—",
                    style = TextStyle(fontSize = 13.sp, fontWeight = FontWeight.Medium, color = ColorProvider(TEXT_PRIMARY)),
                  )
                }
              }
            }
          }
        }
      }
    }
  }

  private fun parseColor(hex: String): Color =
    try { Color(android.graphics.Color.parseColor(hex)) } catch (_: Exception) { TEXT_SUBTLE }

  private companion object {
    // theme/palette.ts dark tokens, as in AccountsGlanceWidget.widgetColors.
    val CARD_BG = Color(0xFF1F1F1F)
    val TEXT_PRIMARY = Color(0xFFF2F2F3)
    val TEXT_SECONDARY = Color(0xFFA9A9AC)
    val TEXT_SUBTLE = Color(0xFF8E8E91)
  }
}

class SafeToSpendGlanceWidgetReceiver : GlanceAppWidgetReceiver() {
  override val glanceAppWidget: GlanceAppWidget = SafeToSpendGlanceWidget()
}
