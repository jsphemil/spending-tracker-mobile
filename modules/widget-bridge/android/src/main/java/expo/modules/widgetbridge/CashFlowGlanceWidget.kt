package expo.modules.widgetbridge

import android.content.Context
import android.graphics.Bitmap
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.datastore.preferences.core.Preferences
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.Image
import androidx.glance.ImageProvider
import androidx.glance.LocalContext
import androidx.glance.LocalSize
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.SizeMode
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.provideContent
import androidx.glance.currentState
import androidx.glance.state.PreferencesGlanceStateDefinition
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.Column
import androidx.glance.layout.Row
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
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

// A third widget alongside the existing Accounts & Quick Add widget and
// the new Quick Add Transaction widget -- neither of those is touched by
// this file. No config screen: always whole-portfolio, base-currency,
// matching how the Dashboard's own monthly totals already work (spec.md
// SS5.20).
private val CARD_BG = Color(0xE60C1120)
private val TEXT_PRIMARY = Color(0xFFF6F8FC)
private val TEXT_SECONDARY = Color(0xFF97A1BC)
private val INFLOW_COLOR = Color(0xFF2FE39B)
private val OUTFLOW_COLOR = Color(0xFFFF5C72)
private val OVERRUN_COLOR = Color(0xFFE24B4A)
private val DIVIDER_COLOR = Color(0xFF2E323F)

private const val CARD_PADDING_DP = 16
private const val BAR_HEIGHT_DP = 14

private fun currentMonthLabel(): String = SimpleDateFormat("MMMM", Locale("en", "IN")).format(Date())

internal sealed interface CashFlowUiState {
  data object Loading : CashFlowUiState
  data object Unavailable : CashFlowUiState
  data class Ready(val data: CashFlowData) : CashFlowUiState
}

class CashFlowGlanceWidget : GlanceAppWidget() {
  // Exact so the bar's fill bitmap can be sized to the container's real
  // pixel width -- Glance has no fractional-width modifier, so the bar
  // is drawn (see CashFlowBarShape.kt), not laid out with weight().
  override val sizeMode = SizeMode.Exact

  // Needed for the same reason the existing Accounts widget needs it
  // (see WidgetConfigStore.kt's own long comment): provideGlance() runs
  // once per session and then parks inside provideContent() forever, so
  // a bare re-read of SQLite on update() would recompose to whatever
  // was already captured. Reusing KEY_DATA_VERSION as a produceState key
  // -- bumped by refreshPortfolioWidgets() below -- is what makes an
  // update() actually re-run the SQLite read instead of no-op'ing.
  override val stateDefinition = PreferencesGlanceStateDefinition

  override suspend fun provideGlance(context: Context, id: GlanceId) {
    val openApp = launchAppIntent(context)
    val iconBitmap = currentAppIconBitmap(context)

    provideContent {
      val dataVersion = currentState<Preferences>()[KEY_DATA_VERSION] ?: 0
      val uiState by produceState<CashFlowUiState>(initialValue = CashFlowUiState.Loading, dataVersion) {
        value = withContext(Dispatchers.IO) {
          val data = getCashFlowData(context)
          if (data == null) CashFlowUiState.Unavailable else CashFlowUiState.Ready(data)
        }
      }
      Content(uiState, LocalSize.current.width, iconBitmap, openApp)
    }
  }

  @Composable
  private fun Content(uiState: CashFlowUiState, widthDp: androidx.compose.ui.unit.Dp, iconBitmap: Bitmap, openApp: android.content.Intent) {
    val context = LocalContext.current
    val density = context.resources.displayMetrics.density
    val barWidthPx = (((widthDp.value - CARD_PADDING_DP * 2) * density).toInt()).coerceAtLeast(1)
    val barHeightPx = (BAR_HEIGHT_DP * density).toInt().coerceAtLeast(1)

    Box(
      modifier = GlanceModifier
        .fillMaxSize()
        .cornerRadius(24.dp)
        .background(CARD_BG)
        .padding(CARD_PADDING_DP.dp),
    ) {
      when (uiState) {
        is CashFlowUiState.Loading -> {}
        is CashFlowUiState.Unavailable -> Box(modifier = GlanceModifier.fillMaxSize(), contentAlignment = Alignment.Center) {
          Text(text = "Cash flow unavailable", style = TextStyle(fontSize = 13.sp, color = ColorProvider(TEXT_SECONDARY)))
        }
        is CashFlowUiState.Ready -> ReadyContent(uiState.data, barWidthPx, barHeightPx, iconBitmap, openApp)
      }
    }
  }

  @Composable
  private fun ReadyContent(data: CashFlowData, barWidthPx: Int, barHeightPx: Int, iconBitmap: Bitmap, openApp: android.content.Intent) {
    val currency = data.baseCurrency
    val outflowFraction = if (data.inflowMinor > 0) data.outflowMinor.toFloat() / data.inflowMinor.toFloat() else 0f
    val overrun = data.inflowMinor > 0 && data.outflowMinor > data.inflowMinor
    val barBitmap = remember(barWidthPx, barHeightPx, outflowFraction, overrun) {
      drawCashFlowBar(barWidthPx, barHeightPx, outflowFraction, overrun)
    }
    val percentLabel = when {
      data.inflowMinor <= 0 -> "No inflow"
      else -> "${Math.round(outflowFraction * 100)}% of inflow"
    }

    Column(modifier = GlanceModifier.fillMaxSize()) {
      Row(
        modifier = GlanceModifier.fillMaxWidth().clickable(actionStartActivity(openApp)),
        verticalAlignment = Alignment.Vertical.CenterVertically,
      ) {
        Image(
          provider = ImageProvider(iconBitmap),
          contentDescription = null,
          modifier = GlanceModifier.size(16.dp).cornerRadius(4.dp),
        )
        Box(modifier = GlanceModifier.width(6.dp)) {}
        Text(
          text = "EREBOR",
          style = TextStyle(fontSize = 11.sp, fontWeight = FontWeight.Bold, color = ColorProvider(TEXT_SECONDARY)),
          modifier = GlanceModifier.defaultWeight(),
        )
        Text(
          text = currentMonthLabel(),
          style = TextStyle(fontSize = 12.sp, fontWeight = FontWeight.Medium, color = ColorProvider(TEXT_SECONDARY)),
        )
      }
      Box(modifier = GlanceModifier.height(10.dp)) {}

      Text(
        text = "Total inflow",
        style = TextStyle(fontSize = 12.sp, color = ColorProvider(TEXT_SECONDARY)),
      )
      Text(
        text = formatMoney(data.inflowMinor, currency),
        style = TextStyle(fontSize = 22.sp, fontWeight = FontWeight.Bold, color = ColorProvider(TEXT_PRIMARY)),
      )
      Box(modifier = GlanceModifier.height(10.dp)) {}

      Image(
        provider = ImageProvider(barBitmap),
        contentDescription = "$percentLabel, ${formatMoney(data.outflowMinor, currency)} outflow",
        modifier = GlanceModifier.fillMaxWidth().height(BAR_HEIGHT_DP.dp),
      )
      Box(modifier = GlanceModifier.height(6.dp)) {}
      Text(
        text = percentLabel,
        style = TextStyle(fontSize = 12.sp, fontWeight = FontWeight.Medium, color = ColorProvider(if (overrun) OVERRUN_COLOR else TEXT_SECONDARY)),
      )
      Box(modifier = GlanceModifier.height(10.dp)) {}

      Row(modifier = GlanceModifier.fillMaxWidth()) {
        Column(modifier = GlanceModifier.defaultWeight()) {
          Text(text = "Outflow", style = TextStyle(fontSize = 11.sp, color = ColorProvider(TEXT_SECONDARY)))
          Text(
            text = formatMoney(data.outflowMinor, currency),
            style = TextStyle(fontSize = 15.sp, fontWeight = FontWeight.Bold, color = ColorProvider(OUTFLOW_COLOR)),
          )
        }
        Column(modifier = GlanceModifier.defaultWeight()) {
          Text(text = "Remaining", style = TextStyle(fontSize = 11.sp, color = ColorProvider(TEXT_SECONDARY)))
          Text(
            text = formatMoney(data.remainingMinor, currency),
            style = TextStyle(
              fontSize = 15.sp,
              fontWeight = FontWeight.Bold,
              color = ColorProvider(if (data.remainingMinor < 0) OVERRUN_COLOR else TEXT_PRIMARY),
            ),
          )
        }
      }

      Box(modifier = GlanceModifier.defaultWeight()) {}
      Box(modifier = GlanceModifier.fillMaxWidth().height(1.dp).background(DIVIDER_COLOR)) {}
      Box(modifier = GlanceModifier.height(10.dp)) {}

      Row(modifier = GlanceModifier.fillMaxWidth(), verticalAlignment = Alignment.Vertical.CenterVertically) {
        Text(
          text = "Today",
          style = TextStyle(fontSize = 11.sp, color = ColorProvider(TEXT_SECONDARY)),
          modifier = GlanceModifier.defaultWeight(),
        )
        Text(
          text = "↑ " + formatMoney(data.todayIncomeMinor, currency),
          style = TextStyle(fontSize = 12.sp, fontWeight = FontWeight.Medium, color = ColorProvider(INFLOW_COLOR)),
        )
        Box(modifier = GlanceModifier.width(10.dp)) {}
        Text(
          text = "↓ " + formatMoney(data.todayExpenseMinor, currency),
          style = TextStyle(fontSize = 12.sp, fontWeight = FontWeight.Medium, color = ColorProvider(OUTFLOW_COLOR)),
        )
      }
    }
  }
}
