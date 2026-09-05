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
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.fillMaxHeight
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
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
//
// Visual design: exact transcription of the finalized Figma export
// (QuickAddTriangleShape.kt draws the three gradient petals, badge
// circles and icon glyphs onto a bitmap). This file positions Glance's
// own clickable regions, Text labels and the hub tap target on top of
// that bitmap, using the same 320-unit-space fractions the bitmap was
// drawn from, so the two stay in sync without duplicated magic numbers.
//
// Square-only sizing (explicit product requirement, not a Glance
// limitation worked around): Android's widget framework has no
// aspect-ratio lock, so the launcher can still offer a non-square
// resize. Regardless of what box it actually allocates, the whole
// composition is inscribed in a centered square sized to
// min(width, height) -- it is never stretched into a non-square shape.
class QuickAddGlanceWidget : GlanceAppWidget() {
  // Exact, not Single, so LocalSize.current reflects the launcher's
  // real allocated size -- the composition bitmap is drawn to that
  // exact (square-clamped) size, not a static asset.
  override val sizeMode = SizeMode.Exact

  override suspend fun provideGlance(context: Context, id: GlanceId) {
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
    val squareDp: Dp = if (size.width < size.height) size.width else size.height
    val squareSizePx = (squareDp.value * density).toInt().coerceAtLeast(1)
    val compositionBitmap = remember(squareSizePx) { drawQuickAddComposition(squareSizePx) }

    val compact = squareDp < 150.dp
    val labelSize = if (compact) 11.sp else 13.sp
    val hubIconSize = squareDp * (HUB_SIZE_FRAC * 0.66f)

    Box(modifier = GlanceModifier.fillMaxSize(), contentAlignment = Alignment.Center) {
      Box(modifier = GlanceModifier.size(squareDp)) {
        Image(
          provider = ImageProvider(compositionBitmap),
          contentDescription = null,
          modifier = GlanceModifier.fillMaxSize(),
        )

        // Three tappable regions, proportioned from the same fractions
        // QuickAddTriangleShape.kt drew the petals from -- the PDF
        // spec explicitly permits transparent rectangular hit areas
        // aligned to each curved surface, since RemoteViews/Glance
        // can only hit-test rectangular view bounds, never an
        // arbitrary drawn path.
        Column(modifier = GlanceModifier.fillMaxSize()) {
          Box(
            modifier = GlanceModifier
              .fillMaxWidth()
              .height(squareDp * TOP_REGION_HEIGHT_FRAC)
              .clickable(actionStartActivity(newTransactionIntent("expense")))
              .semantics { contentDescription = "Add expense" },
            contentAlignment = Alignment.BottomCenter,
          ) {
            Text(
              text = "Expense",
              style = TextStyle(fontSize = labelSize, fontWeight = FontWeight.Bold, color = ColorProvider(androidx.compose.ui.graphics.Color.White)),
              modifier = GlanceModifier.padding(bottom = squareDp * EXPENSE_LABEL_BOTTOM_PAD_FRAC),
            )
          }
          Row(modifier = GlanceModifier.fillMaxWidth().fillMaxHeight()) {
            Box(
              modifier = GlanceModifier
                .defaultWeight()
                .fillMaxHeight()
                .clickable(actionStartActivity(newTransactionIntent("income")))
                .semantics { contentDescription = "Add income" },
              contentAlignment = Alignment.BottomCenter,
            ) {
              Text(
                text = "Income",
                style = TextStyle(fontSize = labelSize, fontWeight = FontWeight.Bold, color = ColorProvider(androidx.compose.ui.graphics.Color.White)),
                modifier = GlanceModifier.padding(bottom = squareDp * INCOME_TRANSFER_LABEL_BOTTOM_PAD_FRAC),
              )
            }
            Box(
              modifier = GlanceModifier
                .defaultWeight()
                .fillMaxHeight()
                .clickable(actionStartActivity(newTransactionIntent("transfer")))
                .semantics { contentDescription = "Add transfer" },
              contentAlignment = Alignment.BottomCenter,
            ) {
              Text(
                text = "Transfer",
                style = TextStyle(fontSize = labelSize, fontWeight = FontWeight.Bold, color = ColorProvider(androidx.compose.ui.graphics.Color.White)),
                modifier = GlanceModifier.padding(bottom = squareDp * INCOME_TRANSFER_LABEL_BOTTOM_PAD_FRAC),
              )
            }
          }
        }

        // Central hub tap target, layered on top (last in this Box's
        // children, so it wins hit-testing over the regions beneath
        // it) -- opens the app itself, matching the existing widget's
        // icon-taps-open-app precedent. Positioned/sized from the same
        // fractions the bitmap's hub circle was drawn from, so the
        // invisible tap target lines up with the visible circle.
        Box(
          modifier = GlanceModifier
            .padding(start = squareDp * HUB_LEFT_FRAC, top = squareDp * HUB_TOP_FRAC)
            .size(squareDp * HUB_SIZE_FRAC)
            .clickable(actionStartActivity(openApp))
            .semantics { contentDescription = "Open Erebor" },
          contentAlignment = Alignment.Center,
        ) {
          Image(
            provider = ImageProvider(iconBitmap),
            contentDescription = null,
            modifier = GlanceModifier.size(hubIconSize).cornerRadius(hubIconSize * 0.2f),
          )
        }
      }
    }
  }
}
