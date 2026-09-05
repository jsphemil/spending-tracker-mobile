package expo.modules.widgetbridge

import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
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
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.fillMaxHeight
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.padding
import androidx.glance.layout.size
import androidx.glance.semantics.contentDescription
import androidx.glance.semantics.semantics
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider

// A companion to the existing "Accounts & Quick Add" widget
// (AccountsGlanceWidget.kt), NOT a replacement -- that widget is
// untouched. This one shows no financial data at all: it is a pure
// action control. Tapping Expense / Income / Transfer opens the
// existing app/transaction/new.tsx flow via the same
// spendingtracker://transaction/new?type=... deep link the existing
// widget's own quick-add pills already use (see WidgetSharedUtil.kt).
class QuickAddGlanceWidget : GlanceAppWidget() {
  // Exact, not Single, so LocalSize.current reflects the launcher's real
  // allocated size -- the triangle background is a bitmap drawn to that
  // exact size (QuickAddTriangleShape.kt), not a static asset, so it has
  // to know the real dimensions to stay crisp and correctly proportioned
  // at any size the user resizes to.
  override val sizeMode = SizeMode.Exact

  override suspend fun provideGlance(context: Context, id: GlanceId) {
    // Session-constant, same reasoning as AccountsGlanceWidget.kt: the
    // launcher icon and the app's launch intent can't change while this
    // session is alive.
    val iconBitmap = currentAppIconBitmap(context)
    val openApp = launchAppIntent(context)

    provideContent {
      Content(LocalSize.current, iconBitmap, openApp)
    }
  }

  @Composable
  private fun Content(size: DpSize, iconBitmap: Bitmap, openApp: Intent) {
    val context = LocalContext.current
    val density = context.resources.displayMetrics.density
    val widthPx = (size.width.value * density).toInt().coerceAtLeast(1)
    val heightPx = (size.height.value * density).toInt().coerceAtLeast(1)
    val triangleBitmap = remember(widthPx, heightPx) { drawRoundedTriangle(widthPx, heightPx) }

    // Never let labels clip or overlap on a small widget -- scale down
    // rather than truncate, and shrink the central hub to match.
    val compact = size.width < 150.dp || size.height < 150.dp
    val labelSize = if (compact) 11.sp else 13.sp
    val hubSize: Dp = if (compact) 30.dp else 42.dp

    Box(modifier = GlanceModifier.fillMaxSize()) {
      Image(
        provider = ImageProvider(triangleBitmap),
        contentDescription = null,
        modifier = GlanceModifier.fillMaxSize(),
      )

      // Three tappable regions layered on top of the triangle image:
      // full-width top strip for Expense (under the triangle's apex),
      // and the bottom split left/right for Income/Transfer. Android
      // widgets can't hit-test an arbitrary drawn path, so this is a
      // deliberate, standard approximation -- visually the triangle,
      // functionally three rectangular regions sized to match where a
      // finger naturally lands for each corner.
      Column(modifier = GlanceModifier.fillMaxSize()) {
        Box(
          modifier = GlanceModifier
            .fillMaxWidth()
            .defaultWeight()
            .clickable(actionStartActivity(newTransactionIntent("expense")))
            .semantics { contentDescription = "Add expense" },
          contentAlignment = Alignment.TopCenter,
        ) {
          ActionLabel("− Expense", WIDGET_EXPENSE, labelSize, GlanceModifier.padding(top = 10.dp))
        }
        Row(modifier = GlanceModifier.fillMaxWidth().defaultWeight()) {
          Box(
            modifier = GlanceModifier
              .defaultWeight()
              .fillMaxHeight()
              .clickable(actionStartActivity(newTransactionIntent("income")))
              .semantics { contentDescription = "Add income" },
            contentAlignment = Alignment.BottomStart,
          ) {
            ActionLabel("+ Income", WIDGET_INCOME, labelSize, GlanceModifier.padding(bottom = 10.dp, start = 10.dp))
          }
          Box(
            modifier = GlanceModifier
              .defaultWeight()
              .fillMaxHeight()
              .clickable(actionStartActivity(newTransactionIntent("transfer")))
              .semantics { contentDescription = "Add transfer" },
            contentAlignment = Alignment.BottomEnd,
          ) {
            ActionLabel("⇄ Transfer", WIDGET_TRANSFER, labelSize, GlanceModifier.padding(bottom = 10.dp, end = 10.dp))
          }
        }
      }

      // Central Erebor-logo hub, on top of everything else, not part of
      // any of the three clickable regions -- tapping it opens the app
      // itself, matching the existing widget's icon-taps-open-app
      // precedent (AccountsGlanceWidget.kt's header icon).
      Box(modifier = GlanceModifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Box(
          modifier = GlanceModifier
            .size(hubSize)
            .cornerRadius(hubSize / 2)
            .background(HUB_BACKGROUND)
            .clickable(actionStartActivity(openApp))
            .semantics { contentDescription = "Open Erebor" },
          contentAlignment = Alignment.Center,
        ) {
          Image(
            provider = ImageProvider(iconBitmap),
            contentDescription = null,
            modifier = GlanceModifier.size(hubSize * 0.68f).cornerRadius(hubSize * 0.2f),
          )
        }
      }
    }
  }

  @Composable
  private fun ActionLabel(text: String, accent: androidx.compose.ui.graphics.Color, size: androidx.compose.ui.unit.TextUnit, modifier: GlanceModifier) {
    Text(
      text = text,
      style = TextStyle(fontSize = size, fontWeight = FontWeight.Bold, color = ColorProvider(accent)),
      modifier = modifier,
    )
  }
}

private val HUB_BACKGROUND = androidx.compose.ui.graphics.Color(0xFF141A2E)
