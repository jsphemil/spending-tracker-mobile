package expo.modules.widgetbridge

import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.net.Uri
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.Image
import androidx.glance.ImageProvider
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.appwidget.GlanceAppWidgetManager
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.provideContent
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

private const val DEEP_LINK_BASE = "spendingtracker://transaction/new"

val WIDGET_ACCENT_CYAN = Color(0xFF48E7F5)

// Matches theme/palette.ts's dark success/danger/transfer tokens — the
// same colors app/(tabs)/accounts/[id].tsx's Income/Expense/Transfer
// buttons use (bg-success/bg-danger/bg-transfer, white text), not the
// brand gradient stops.
val WIDGET_INCOME = Color(0xFF2FE39B)
val WIDGET_EXPENSE = Color(0xFFFF5C72)
val WIDGET_TRANSFER = Color(0xFFFFC24B)

data class WidgetColors(
  val cardBg: Color,
  val border: Color,
  val dividerStrong: Color,
  val textPrimary: Color,
  val textSecondary: Color,
)

private fun rgba(r: Int, g: Int, b: Int, alpha: Float): Color =
  Color(red = r / 255f, green = g / 255f, blue = b / 255f, alpha = alpha)

// Matches theme/palette.ts's dark tokens — the app has no light theme
// (Erebor is dark-only, see useResolvedTheme()), so this is the only
// variant that exists; only cardBg's alpha is user-adjustable.
private fun widgetColors(opacityPct: Int): WidgetColors {
  val alpha = opacityPct.coerceIn(0, 100) / 100f
  return WidgetColors(
    cardBg = rgba(12, 17, 32, alpha),
    border = Color(0xFF1F2432),
    dividerStrong = Color(0xFF2E323F),
    textPrimary = Color(0xFFF6F8FC),
    textSecondary = Color(0xFF97A1BC),
  )
}

private fun currentMonthLabel(): String =
  SimpleDateFormat("MMMM yyyy", Locale("en", "IN")).format(Date())

private fun openAppIntent(context: Context): Intent =
  context.packageManager.getLaunchIntentForPackage(context.packageName)
    ?: Intent(Intent.ACTION_VIEW, Uri.parse("spendingtracker://"))

// Reads the real installed launcher icon at draw time instead of bundling
// a duplicate asset in this module — always matches the actual app icon,
// and this library module can't reference the :app module's mipmap
// resources directly (dependency direction runs the other way).
private fun getAppIconBitmap(context: Context): Bitmap {
  val drawable = context.packageManager.getApplicationIcon(context.packageName)
  val width = drawable.intrinsicWidth.coerceAtLeast(1)
  val height = drawable.intrinsicHeight.coerceAtLeast(1)
  val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
  val canvas = Canvas(bitmap)
  drawable.setBounds(0, 0, canvas.width, canvas.height)
  drawable.draw(canvas)
  return bitmap
}

class AccountsGlanceWidget : GlanceAppWidget() {
  override suspend fun provideGlance(context: Context, id: GlanceId) {
    val appWidgetId = GlanceAppWidgetManager(context).getAppWidgetId(id)
    val config = getWidgetConfig(context, appWidgetId)
    val accounts = getAccountsForWidget(context, config.accountIds)
    val colors = widgetColors(config.opacityPct)
    val monthLabel = currentMonthLabel()
    val iconBitmap = getAppIconBitmap(context)
    val openApp = openAppIntent(context)

    provideContent {
      Content(accounts, colors, monthLabel, iconBitmap, openApp)
    }
  }

  @Composable
  private fun Content(
    accounts: List<WidgetAccountBalance>,
    colors: WidgetColors,
    monthLabel: String,
    iconBitmap: Bitmap,
    openApp: Intent,
  ) {
    // fillMaxSize (not just fillMaxWidth) so the card's translucent
    // background covers the whole launcher-allocated box — otherwise the
    // resize handles trail past the visible card into dead transparent
    // space whenever the allocated grid cell is taller than the content.
    val cardModifier = GlanceModifier
      .fillMaxSize()
      .cornerRadius(24.dp)
      .background(colors.cardBg)
      .padding(16.dp)
      .let { if (accounts.isEmpty()) it.clickable(actionStartActivity(openApp)) else it }

    Box(modifier = cardModifier) {
      Column(modifier = GlanceModifier.fillMaxSize()) {
        Row(modifier = GlanceModifier.fillMaxWidth(), verticalAlignment = Alignment.Vertical.CenterVertically) {
          Text(
            text = monthLabel,
            style = TextStyle(fontSize = 12.sp, fontWeight = FontWeight.Medium, color = ColorProvider(colors.textSecondary)),
            modifier = GlanceModifier.defaultWeight(),
          )
          Image(
            provider = ImageProvider(iconBitmap),
            contentDescription = null,
            modifier = GlanceModifier
              .size(26.dp)
              .cornerRadius(8.dp)
              .clickable(actionStartActivity(openApp)),
          )
        }
        Box(modifier = GlanceModifier.height(10.dp)) {}

        // defaultWeight() so this section absorbs any extra/deficit height
        // the launcher allocates beyond the natural content size — keeps
        // the header pinned to the top and the action pills pinned to the
        // bottom at every resize step, instead of leaving dead space below
        // the pills (taller) or letting the pills get pushed off (shorter).
        Column(
          modifier = GlanceModifier.fillMaxWidth().defaultWeight(),
          verticalAlignment = Alignment.Vertical.CenterVertically,
        ) {
          if (accounts.isEmpty()) {
            Text(
              text = "Tap to choose accounts",
              style = TextStyle(fontSize = 13.sp, color = ColorProvider(colors.textSecondary)),
            )
          } else {
            accounts.forEachIndexed { index, acct ->
              if (index > 0) {
                Box(modifier = GlanceModifier.fillMaxWidth().height(1.dp).background(colors.border)) {}
              }
              Row(
                modifier = GlanceModifier.fillMaxWidth().padding(vertical = 7.dp),
                verticalAlignment = Alignment.Vertical.CenterVertically,
              ) {
                Text(
                  text = acct.name,
                  maxLines = 1,
                  style = TextStyle(fontSize = 15.sp, fontWeight = FontWeight.Medium, color = ColorProvider(colors.textPrimary)),
                  modifier = GlanceModifier.defaultWeight(),
                )
                Text(
                  text = formatMoney(acct.balanceMinor, acct.currency),
                  style = TextStyle(fontSize = 16.sp, fontWeight = FontWeight.Bold, color = ColorProvider(WIDGET_ACCENT_CYAN)),
                )
              }
            }
          }
        }

        Box(modifier = GlanceModifier.fillMaxWidth().height(1.dp).background(colors.dividerStrong).padding(top = 6.dp)) {}
        Box(modifier = GlanceModifier.height(12.dp)) {}

        Row(modifier = GlanceModifier.fillMaxWidth()) {
          ActionPill("Income", WIDGET_INCOME, "income", GlanceModifier.defaultWeight())
          Box(modifier = GlanceModifier.width(8.dp)) {}
          ActionPill("Expense", WIDGET_EXPENSE, "expense", GlanceModifier.defaultWeight())
          Box(modifier = GlanceModifier.width(8.dp)) {}
          ActionPill("Transfer", WIDGET_TRANSFER, "transfer", GlanceModifier.defaultWeight())
        }
      }
    }
  }

  @Composable
  private fun ActionPill(label: String, accent: Color, type: String, modifier: GlanceModifier) {
    Box(
      modifier = modifier
        .height(40.dp)
        .cornerRadius(20.dp)
        .background(accent)
        .clickable(actionStartActivity(Intent(Intent.ACTION_VIEW, Uri.parse("$DEEP_LINK_BASE?type=$type")))),
      contentAlignment = Alignment.Center,
    ) {
      Text(
        text = "+ $label",
        style = TextStyle(fontSize = 13.sp, fontWeight = FontWeight.Bold, color = ColorProvider(Color.White)),
      )
    }
  }
}
