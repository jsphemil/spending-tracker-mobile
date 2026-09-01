package expo.modules.widgetbridge

import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.net.Uri
import android.util.Log
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.produceState
import androidx.compose.ui.graphics.Color
import androidx.datastore.preferences.core.Preferences
import androidx.glance.currentState
import androidx.glance.state.PreferencesGlanceStateDefinition
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
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
import androidx.glance.appwidget.lazy.LazyColumn
import androidx.glance.appwidget.lazy.itemsIndexed
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
private const val TAG = "WidgetBridge"

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

// What the middle section of the card is showing. These are four genuinely
// different situations and they must not collapse into one another — in
// particular "we couldn't read the database" is not "you have no accounts".
sealed interface AccountsUiState {
  data object Loading : AccountsUiState
  data object NotConfigured : AccountsUiState
  data object Unavailable : AccountsUiState
  data class Ready(val accounts: List<WidgetAccountBalance>) : AccountsUiState
}

private fun loadAccountsState(context: Context, accountIds: List<Long>): AccountsUiState =
  runCatching { getAccountsForWidget(context, accountIds) }
    .fold(
      onSuccess = { rows -> if (rows == null) AccountsUiState.Unavailable else AccountsUiState.Ready(rows) },
      onFailure = { error ->
        Log.w(TAG, "Could not load widget accounts for ids=$accountIds", error)
        AccountsUiState.Unavailable
      },
    )

class AccountsGlanceWidget : GlanceAppWidget() {
  // Backs currentState() below. Without a state definition there is no
  // observable state for the composition to read, and the widget can only
  // ever show data captured at session start.
  override val stateDefinition = PreferencesGlanceStateDefinition

  override suspend fun provideGlance(context: Context, id: GlanceId) {
    val appWidgetId = GlanceAppWidgetManager(context).getAppWidgetId(id)
    migrateLegacySelectionIfNeeded(context, id, appWidgetId)

    // Genuinely session-constant, so capturing these is safe: the launcher
    // icon and the app's own launch intent cannot change while a session
    // is alive without the process being restarted anyway.
    val iconBitmap = getAppIconBitmap(context)
    val openApp = openAppIntent(context)

    provideContent {
      // provideContent never returns (its return type is Nothing) — this
      // lambda is the whole session. So everything that can change while
      // the widget is on screen has to be read HERE, as observable state,
      // not captured above. currentState() is backed by the widget's
      // Glance DataStore: writing it invalidates this composition, which
      // is what makes update() actually re-render.
      val prefs = currentState<Preferences>()
      val selection = prefs.readSelection()
      val dataVersion = prefs[KEY_DATA_VERSION] ?: 0

      // Re-runs whenever the selection or the data version changes. The
      // data version is what lets a balance-only change (same account ids,
      // different transactions) invalidate and re-read SQLite.
      val uiState by produceState<AccountsUiState>(
        initialValue = AccountsUiState.Loading,
        selection.configured,
        selection.accountIds,
        dataVersion,
      ) {
        value = if (!selection.configured) {
          AccountsUiState.NotConfigured
        } else {
          withContext(Dispatchers.IO) { loadAccountsState(context, selection.accountIds) }
        }
      }

      Content(uiState, widgetColors(selection.opacityPct), currentMonthLabel(), iconBitmap, openApp)
    }
  }

  @Composable
  private fun Content(
    uiState: AccountsUiState,
    colors: WidgetColors,
    monthLabel: String,
    iconBitmap: Bitmap,
    openApp: Intent,
  ) {
    val accounts = (uiState as? AccountsUiState.Ready)?.accounts ?: emptyList()
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
        // bottom at every resize step. The empty-state placeholder stays
        // centered (a single short line looks odd pinned to the top), but
        // a real account list renders top-aligned via LazyColumn instead of
        // a plain Column — so any extra allocated height shows up as one
        // gap below the last row rather than padding split above and below
        // it, and a widget resized tall with many accounts scrolls instead
        // of overflowing or clipping.
        if (accounts.isEmpty()) {
          Column(
            modifier = GlanceModifier.fillMaxWidth().defaultWeight(),
            verticalAlignment = Alignment.Vertical.CenterVertically,
          ) {
            // Loading renders no text at all rather than a placeholder that
            // would flash and immediately be replaced. The other three are
            // distinct messages on purpose: a failed read must never be
            // reported to the user as "you have not chosen any accounts".
            val message = when (uiState) {
              is AccountsUiState.Loading -> null
              is AccountsUiState.NotConfigured -> "Tap to choose accounts"
              is AccountsUiState.Unavailable -> "Balances unavailable"
              is AccountsUiState.Ready -> "No accounts selected"
            }
            if (message != null) {
              Text(
                text = message,
                style = TextStyle(fontSize = 13.sp, color = ColorProvider(colors.textSecondary)),
              )
            }
          }
        } else {
          LazyColumn(modifier = GlanceModifier.fillMaxWidth().defaultWeight()) {
            itemsIndexed(accounts, itemId = { _, acct -> acct.id }) { index, acct ->
              Column {
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
