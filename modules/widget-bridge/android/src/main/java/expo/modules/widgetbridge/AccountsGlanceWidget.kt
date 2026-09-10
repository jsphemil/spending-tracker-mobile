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
import androidx.glance.ColorFilter
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
import androidx.glance.appwidget.action.actionRunCallback
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
  val textSubtle: Color,
)

private fun rgba(r: Int, g: Int, b: Int, alpha: Float): Color =
  Color(red = r / 255f, green = g / 255f, blue = b / 255f, alpha = alpha)

// Matches theme/palette.ts's dark tokens. The app gained a real light theme
// in V2, so this is a deliberate divergence rather than the only variant
// that exists — a widget sits on the launcher's own wallpaper, not inside
// the app, and only cardBg's alpha is user-adjustable.
private fun widgetColors(opacityPct: Int): WidgetColors {
  val alpha = opacityPct.coerceIn(0, 100) / 100f
  return WidgetColors(
    cardBg = rgba(12, 17, 32, alpha),
    border = Color(0xFF1F2432),
    dividerStrong = Color(0xFF2E323F),
    textPrimary = Color(0xFFF6F8FC),
    textSecondary = Color(0xFF97A1BC),
    textSubtle = Color(0xFF5C6584),
  )
}

// Mirrors constants/accountTypes.ts's ACCOUNT_TYPE_LABELS and
// ACCOUNT_TYPE_ICONS. The icon is chosen by TYPE rather than by the
// account's own `icon` column: the app's icons are Lucide React components
// with no Android equivalent, and shipping the five type defaults covers
// every account that hasn't overridden its icon.
private fun accountTypeLabel(type: String): String = when (type) {
  "savings" -> "Savings"
  "investment" -> "Investment"
  "deposit" -> "Deposit"
  "wallet" -> "Wallet / Cash"
  "credit_card" -> "Credit Card"
  else -> type.replaceFirstChar { it.uppercase() }
}

private fun accountTypeIcon(type: String): Int = when (type) {
  "savings" -> R.drawable.ic_acct_savings
  "investment" -> R.drawable.ic_acct_investment
  "deposit" -> R.drawable.ic_acct_deposit
  "credit_card" -> R.drawable.ic_acct_credit_card
  else -> R.drawable.ic_acct_wallet
}

// Accounts store a "#RRGGBB" string chosen from constants/colorPalette.ts.
// Anything unparseable falls back to the accent rather than throwing inside
// the launcher's process.
private fun parseAccountColor(hex: String): Color =
  runCatching { Color(android.graphics.Color.parseColor(hex)) }.getOrDefault(WIDGET_ACCENT_CYAN)

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

// What the middle section of the card is showing. These are genuinely
// different situations and they must not collapse into one another — in
// particular "we couldn't read the database" is not "you have no accounts".
sealed interface AccountsUiState {
  data object Loading : AccountsUiState
  data object NotConfigured : AccountsUiState
  data object Unavailable : AccountsUiState

  /**
   * `detail` is the account the card renders; `options` is every configured
   * account, needed only by the picker. Loading both together keeps
   * switching instant — tapping a name re-renders from state already in
   * hand instead of waiting on SQLite.
   */
  data class Ready(
    val detail: WidgetAccountDetail?,
    val options: List<WidgetAccountBalance>,
  ) : AccountsUiState
}

private fun loadAccountsState(
  context: Context,
  accountIds: List<Long>,
  selectedAccountId: Long?,
): AccountsUiState =
  runCatching {
    val options = getAccountsForWidget(context, accountIds) ?: return@runCatching null
    val detail = selectedAccountId?.let { getAccountDetailForWidget(context, it) }
    AccountsUiState.Ready(detail, options)
  }.fold(
    onSuccess = { state -> state ?: AccountsUiState.Unavailable },
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

      // Keyed on the selected id as well as the data version, so switching
      // account re-reads that account's month figures. The picker's own
      // open/closed flag is deliberately NOT a key — opening the picker
      // must not trigger a database round trip.
      val uiState by produceState<AccountsUiState>(
        initialValue = AccountsUiState.Loading,
        selection.configured,
        selection.accountIds,
        selection.selectedAccountId,
        dataVersion,
      ) {
        value = if (!selection.configured) {
          AccountsUiState.NotConfigured
        } else {
          withContext(Dispatchers.IO) {
            loadAccountsState(context, selection.accountIds, selection.selectedAccountId)
          }
        }
      }

      Content(
        uiState = uiState,
        colors = widgetColors(selection.opacityPct),
        monthLabel = currentMonthLabel(),
        pickerOpen = selection.pickerOpen,
        selectedIndex = selection.selectedIndex,
        iconBitmap = iconBitmap,
        openApp = openApp,
      )
    }
  }

  @Composable
  private fun Content(
    uiState: AccountsUiState,
    colors: WidgetColors,
    monthLabel: String,
    pickerOpen: Boolean,
    selectedIndex: Int,
    iconBitmap: Bitmap,
    openApp: Intent,
  ) {
    val ready = uiState as? AccountsUiState.Ready
    val detail = ready?.detail
    // fillMaxSize (not just fillMaxWidth) so the card's translucent
    // background covers the whole launcher-allocated box — otherwise the
    // resize handles trail past the visible card into dead transparent
    // space whenever the allocated grid cell is taller than the content.
    val cardModifier = GlanceModifier
      .fillMaxSize()
      .cornerRadius(24.dp)
      .background(colors.cardBg)
      .padding(16.dp)
      .let { if (detail == null) it.clickable(actionStartActivity(openApp)) else it }

    Box(modifier = cardModifier) {
      Column(modifier = GlanceModifier.fillMaxSize()) {
        Header(colors, monthLabel, pickerOpen, iconBitmap, openApp)
        Box(modifier = GlanceModifier.height(10.dp)) {}

        // defaultWeight() is a ColumnScope extension, so it can only be
        // called here — inside the Column — and has to be handed to the
        // body composables rather than applied inside them. It makes the
        // body absorb any slack height, keeping the header pinned to the
        // top and the pills to the bottom.
        val bodyModifier = GlanceModifier.fillMaxWidth().defaultWeight()
        if (detail == null) {
          EmptyBody(uiState, colors, bodyModifier)
        } else if (pickerOpen) {
          AccountPicker(ready.options, selectedIndex, colors, bodyModifier)
        } else {
          AccountCard(detail, colors, bodyModifier)
        }

        Box(modifier = GlanceModifier.height(10.dp)) {}
        Row(modifier = GlanceModifier.fillMaxWidth()) {
          ActionPill("Income", WIDGET_INCOME, "income", detail?.id, GlanceModifier.defaultWeight())
          Box(modifier = GlanceModifier.width(8.dp)) {}
          ActionPill("Expense", WIDGET_EXPENSE, "expense", detail?.id, GlanceModifier.defaultWeight())
          Box(modifier = GlanceModifier.width(8.dp)) {}
          ActionPill("Transfer", WIDGET_TRANSFER, "transfer", detail?.id, GlanceModifier.defaultWeight())
        }
      }
    }
  }

  // Erebor wordmark + logo on the left, month on the right. While the picker
  // is open the whole header becomes the way back out, so choosing is
  // escapable without committing to a different account.
  @Composable
  private fun Header(
    colors: WidgetColors,
    monthLabel: String,
    pickerOpen: Boolean,
    iconBitmap: Bitmap,
    openApp: Intent,
  ) {
    Row(
      modifier = GlanceModifier
        .fillMaxWidth()
        .let {
          if (pickerOpen) it.clickable(actionRunCallback<CloseAccountPickerAction>()) else it
        },
      verticalAlignment = Alignment.Vertical.CenterVertically,
    ) {
      Image(
        provider = ImageProvider(iconBitmap),
        contentDescription = null,
        modifier = GlanceModifier
          .size(22.dp)
          .cornerRadius(6.dp)
          .let { if (pickerOpen) it else it.clickable(actionStartActivity(openApp)) },
      )
      Box(modifier = GlanceModifier.width(7.dp)) {}
      Text(
        text = "Erebor",
        style = TextStyle(
          fontSize = 13.sp,
          fontWeight = FontWeight.Bold,
          color = ColorProvider(colors.textPrimary),
        ),
        modifier = GlanceModifier.defaultWeight(),
      )
      Text(
        text = if (pickerOpen) "Tap to close" else monthLabel,
        style = TextStyle(fontSize = 12.sp, fontWeight = FontWeight.Medium, color = ColorProvider(colors.textSecondary)),
      )
    }
  }

  // The account card, mirroring one row of app/(tabs)/accounts/index.tsx.
  @Composable
  private fun AccountCard(
    detail: WidgetAccountDetail,
    colors: WidgetColors,
    modifier: GlanceModifier,
  ) {
    Column(modifier = modifier) {
      Row(
        modifier = GlanceModifier
          .fillMaxWidth()
          // The name row is the switcher. Tapping it swaps this card for the
          // picker without leaving the home screen.
          .clickable(actionRunCallback<OpenAccountPickerAction>()),
        verticalAlignment = Alignment.Vertical.CenterVertically,
      ) {
        Box(
          modifier = GlanceModifier
            .size(38.dp)
            .cornerRadius(19.dp)
            .background(parseAccountColor(detail.colorHex)),
          contentAlignment = Alignment.Center,
        ) {
          Image(
            provider = ImageProvider(accountTypeIcon(detail.type)),
            contentDescription = null,
            colorFilter = ColorFilter.tint(ColorProvider(Color.White)),
            modifier = GlanceModifier.size(18.dp),
          )
        }
        Box(modifier = GlanceModifier.width(10.dp)) {}
        Column(modifier = GlanceModifier.defaultWeight()) {
          Text(
            text = detail.name,
            maxLines = 1,
            style = TextStyle(fontSize = 15.sp, fontWeight = FontWeight.Medium, color = ColorProvider(colors.textPrimary)),
          )
          Text(
            // The chevron is the affordance that this row is tappable —
            // a widget has no hover or ripple to hint with.
            text = "${accountTypeLabel(detail.type)}  ▾",
            maxLines = 1,
            style = TextStyle(fontSize = 12.sp, color = ColorProvider(colors.textSecondary)),
          )
        }
        Box(modifier = GlanceModifier.width(8.dp)) {}
        Column(horizontalAlignment = Alignment.Horizontal.End) {
          Text(
            text = formatMoney(detail.balanceMinor, detail.currency),
            maxLines = 1,
            style = TextStyle(fontSize = 16.sp, fontWeight = FontWeight.Bold, color = ColorProvider(colors.textPrimary)),
          )
          // Stacked rather than inline (CurrencyAmount's other form) because
          // a widget row is far narrower than the app's, and "AED 450.00 ·
          // ≈ ₹11,627.91" on one line would truncate.
          if (detail.baseEquivalentMinor != null) {
            Text(
              text = "≈ ${formatMoney(detail.baseEquivalentMinor, detail.baseCurrency)}",
              maxLines = 1,
              style = TextStyle(fontSize = 11.sp, color = ColorProvider(colors.textSubtle)),
            )
          }
        }
      }

      Box(modifier = GlanceModifier.height(10.dp)) {}
      Box(modifier = GlanceModifier.fillMaxWidth().height(1.dp).background(colors.border)) {}
      Box(modifier = GlanceModifier.height(10.dp)) {}

      Row(modifier = GlanceModifier.fillMaxWidth()) {
        FlowColumn("Income", formatMoney(detail.incomeMinor, detail.currency), WIDGET_INCOME, colors, GlanceModifier.defaultWeight())
        FlowColumn("Expense", formatMoney(detail.expenseMinor, detail.currency), WIDGET_EXPENSE, colors, GlanceModifier.defaultWeight())
        FlowColumn(
          "Transfers",
          // Net in − out, with an explicit "+" when non-negative, matching
          // the app's card exactly.
          (if (detail.netTransferMinor >= 0) "+" else "") + formatMoney(detail.netTransferMinor, detail.currency),
          if (detail.netTransferMinor >= 0) WIDGET_ACCENT_CYAN else WIDGET_EXPENSE,
          colors,
          GlanceModifier.defaultWeight(),
        )
      }
    }
  }

  @Composable
  private fun FlowColumn(
    label: String,
    value: String,
    valueColor: Color,
    colors: WidgetColors,
    modifier: GlanceModifier,
  ) {
    Column(modifier = modifier) {
      Text(
        text = label,
        style = TextStyle(fontSize = 11.sp, color = ColorProvider(colors.textSecondary)),
      )
      Text(
        text = value,
        maxLines = 1,
        style = TextStyle(fontSize = 12.sp, fontWeight = FontWeight.Medium, color = ColorProvider(valueColor)),
      )
    }
  }

  // The switcher. A LazyColumn because this is a transient mode where
  // scrolling is acceptable — unlike the resting card, whose fixed height is
  // the whole reason the old list widget's resize bugs are gone.
  @Composable
  private fun AccountPicker(
    options: List<WidgetAccountBalance>,
    selectedIndex: Int,
    colors: WidgetColors,
    modifier: GlanceModifier,
  ) {
    LazyColumn(modifier = modifier) {
      itemsIndexed(options, itemId = { _, acct -> acct.id }) { index, acct ->
        Column {
          if (index > 0) {
            Box(modifier = GlanceModifier.fillMaxWidth().height(1.dp).background(colors.border)) {}
          }
          Row(
            modifier = GlanceModifier
              .fillMaxWidth()
              .padding(vertical = 8.dp)
              .clickable(actionRunCallback<SelectAccountAction>(accountIndexParams(index))),
            verticalAlignment = Alignment.Vertical.CenterVertically,
          ) {
            Text(
              text = if (index == selectedIndex) "●  ${acct.name}" else "    ${acct.name}",
              maxLines = 1,
              style = TextStyle(
                fontSize = 14.sp,
                fontWeight = if (index == selectedIndex) FontWeight.Bold else FontWeight.Normal,
                color = ColorProvider(if (index == selectedIndex) WIDGET_ACCENT_CYAN else colors.textPrimary),
              ),
              modifier = GlanceModifier.defaultWeight(),
            )
            Text(
              text = formatMoney(acct.balanceMinor, acct.currency),
              maxLines = 1,
              style = TextStyle(fontSize = 13.sp, color = ColorProvider(colors.textSecondary)),
            )
          }
        }
      }
    }
  }

  @Composable
  private fun EmptyBody(
    uiState: AccountsUiState,
    colors: WidgetColors,
    modifier: GlanceModifier,
  ) {
    Column(
      modifier = modifier,
      verticalAlignment = Alignment.Vertical.CenterVertically,
    ) {
      // Loading renders no text at all rather than a placeholder that
      // would flash and immediately be replaced. The rest are distinct
      // messages on purpose: a failed read must never be reported to the
      // user as "you have not chosen any accounts".
      val message = when (uiState) {
        is AccountsUiState.Loading -> null
        is AccountsUiState.NotConfigured -> "Tap to choose accounts"
        is AccountsUiState.Unavailable -> "Balances unavailable"
        // Ready with no detail means the configured account list is empty,
        // or the selected account was deleted since.
        is AccountsUiState.Ready -> "No accounts selected"
      }
      if (message != null) {
        Text(
          text = message,
          style = TextStyle(fontSize = 13.sp, color = ColorProvider(colors.textSecondary)),
        )
      }
    }
  }

  // accountId pre-selects the shown account in the add-transaction screen —
  // the app already accepts it (app/(tabs)/accounts/[id].tsx links the same
  // way), and a single-account widget finally has an unambiguous one to send.
  @Composable
  private fun ActionPill(
    label: String,
    accent: Color,
    type: String,
    accountId: Long?,
    modifier: GlanceModifier,
  ) {
    val uri = if (accountId != null) {
      "$DEEP_LINK_BASE?type=$type&accountId=$accountId"
    } else {
      "$DEEP_LINK_BASE?type=$type"
    }
    Box(
      modifier = modifier
        .height(38.dp)
        .cornerRadius(19.dp)
        .background(accent)
        .clickable(actionStartActivity(Intent(Intent.ACTION_VIEW, Uri.parse(uri)))),
      contentAlignment = Alignment.Center,
    ) {
      Text(
        text = "+ $label",
        style = TextStyle(fontSize = 13.sp, fontWeight = FontWeight.Bold, color = ColorProvider(Color.White)),
      )
    }
  }
}
