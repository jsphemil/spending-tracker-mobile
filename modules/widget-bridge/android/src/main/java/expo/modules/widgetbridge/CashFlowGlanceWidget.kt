package expo.modules.widgetbridge

import android.content.Context
import android.graphics.Bitmap
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.DpSize
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

// Below this the "regular" spacing/font budget doesn't reliably leave
// room for every section including Today -- confirmed by measuring the
// actual content stack against the widget's declared minimum size,
// after a real bug where Today was silently clipped off the bottom of
// a Column that had no room left for it (Glance/RemoteViews don't
// scroll or auto-shrink content that overflows).
private val COMPACT_HEIGHT_THRESHOLD = 220.dp

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
      Content(uiState, LocalSize.current, iconBitmap, openApp)
    }
  }

  @Composable
  private fun Content(uiState: CashFlowUiState, size: DpSize, iconBitmap: Bitmap, openApp: android.content.Intent) {
    val context = LocalContext.current
    val density = context.resources.displayMetrics.density
    val compact = size.height < COMPACT_HEIGHT_THRESHOLD
    val cardPaddingDp: Dp = if (compact) 12.dp else 16.dp
    val barHeightDp: Dp = if (compact) 10.dp else 14.dp
    val barWidthPx = (((size.width - cardPaddingDp * 2).value * density).toInt()).coerceAtLeast(1)
    val barHeightPx = (barHeightDp.value * density).toInt().coerceAtLeast(1)

    Box(
      modifier = GlanceModifier
        .fillMaxSize()
        .cornerRadius(24.dp)
        .background(CARD_BG)
        .padding(cardPaddingDp),
    ) {
      when (uiState) {
        is CashFlowUiState.Loading -> {}
        is CashFlowUiState.Unavailable -> Box(modifier = GlanceModifier.fillMaxSize(), contentAlignment = Alignment.Center) {
          Text(text = "Cash flow unavailable", style = TextStyle(fontSize = 13.sp, color = ColorProvider(TEXT_SECONDARY)))
        }
        is CashFlowUiState.Ready -> ReadyContent(uiState.data, compact, barHeightDp, barWidthPx, barHeightPx, iconBitmap, openApp)
      }
    }
  }

  @Composable
  private fun ReadyContent(
    data: CashFlowData,
    compact: Boolean,
    barHeightDp: Dp,
    barWidthPx: Int,
    barHeightPx: Int,
    iconBitmap: Bitmap,
    openApp: android.content.Intent,
  ) {
    val gapL: Dp = if (compact) 4.dp else 8.dp
    val gapS: Dp = if (compact) 3.dp else 6.dp
    val inflowFontSize = if (compact) 18.sp else 22.sp
    val statFontSize = if (compact) 13.sp else 15.sp
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
      Box(modifier = GlanceModifier.height(gapL)) {}

      Text(
        text = "Total inflow",
        style = TextStyle(fontSize = 12.sp, color = ColorProvider(TEXT_SECONDARY)),
      )
      Text(
        text = formatMoney(data.inflowMinor, currency),
        style = TextStyle(fontSize = inflowFontSize, fontWeight = FontWeight.Bold, color = ColorProvider(TEXT_PRIMARY)),
      )
      Box(modifier = GlanceModifier.height(gapL)) {}

      Image(
        provider = ImageProvider(barBitmap),
        contentDescription = "$percentLabel, ${formatMoney(data.outflowMinor, currency)} outflow",
        modifier = GlanceModifier.fillMaxWidth().height(barHeightDp),
      )
      Box(modifier = GlanceModifier.height(gapS)) {}
      Text(
        text = percentLabel,
        style = TextStyle(fontSize = 12.sp, fontWeight = FontWeight.Medium, color = ColorProvider(if (overrun) OVERRUN_COLOR else TEXT_SECONDARY)),
      )
      Box(modifier = GlanceModifier.height(gapL)) {}

      Row(modifier = GlanceModifier.fillMaxWidth()) {
        Column(modifier = GlanceModifier.defaultWeight()) {
          Text(text = "Outflow", style = TextStyle(fontSize = 11.sp, color = ColorProvider(TEXT_SECONDARY)))
          Text(
            text = formatMoney(data.outflowMinor, currency),
            style = TextStyle(fontSize = statFontSize, fontWeight = FontWeight.Bold, color = ColorProvider(OUTFLOW_COLOR)),
          )
        }
        Column(modifier = GlanceModifier.defaultWeight()) {
          Text(text = "Remaining", style = TextStyle(fontSize = 11.sp, color = ColorProvider(TEXT_SECONDARY)))
          Text(
            text = formatMoney(data.remainingMinor, currency),
            style = TextStyle(
              fontSize = statFontSize,
              fontWeight = FontWeight.Bold,
              color = ColorProvider(if (data.remainingMinor < 0) OVERRUN_COLOR else TEXT_PRIMARY),
            ),
          )
        }
      }

      // Deliberately NOT pinned to the bottom via a flexible spacer --
      // an earlier attempt (an empty Box with only .defaultWeight(),
      // then with .fillMaxWidth().defaultWeight() added) reliably
      // absorbed the extra height as expected, but silently prevented
      // everything after it (this divider and the Today row) from
      // rendering at all, confirmed on-device across two fix attempts.
      // Placing Today right after Outflow/Remaining with normal spacing
      // avoids that Glance behavior entirely, at the cost of Today
      // sitting right under the stats instead of floating at the very
      // bottom on a tall widget.
      Box(modifier = GlanceModifier.height(gapL)) {}
      Box(modifier = GlanceModifier.fillMaxWidth().height(1.dp).background(DIVIDER_COLOR)) {}
      Box(modifier = GlanceModifier.height(gapL)) {}

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
