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
import androidx.glance.LocalSize
import androidx.glance.appwidget.SizeMode
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

// The card's design size in dp at scale 1.0, and the only place its
// proportions are defined. Every dimension in Content and below is a base
// value multiplied by the scale factor derived from these, so the whole
// card zooms as one piece.
//
// The height is the sum of the content at base scale — padding 14*2,
// header 22, gap 8, account row 36, divider 1 + gap 8, flow row ~29,
// gap 8, pills 36 — so at scale 1.0 the content fills the card exactly,
// with no slack to distribute. Change one and the other must follow.
private const val BASE_CARD_WIDTH = 300f
private const val BASE_CARD_HEIGHT = 184f

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

  // Exact, not Single: the layout adapts to the launcher's actual
  // allocation (see Content), which is what lets this be freely resizable
  // instead of correct at exactly one height. LocalSize.current only
  // reports the real size under this mode.
  override val sizeMode = SizeMode.Exact

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

  // The card is drawn at a fixed design size and then ZOOMED to whatever
  // the launcher allocates — every dimension below is a base value
  // multiplied by one scale factor, fonts included. Resizing the widget
  // makes the whole card bigger or smaller rather than reflowing it.
  //
  // This replaced two earlier approaches that both left visible dead space:
  // filling the box with a fixed-size layout pooled the slack into a void,
  // and adding/removing rows at breakpoints still left slack between them.
  // Scaling has neither problem: the content always exactly fills the card.
  //
  // Aspect is preserved (scale is the smaller of the two ratios) so the
  // card never distorts or clips, and the card is centred, so whatever the
  // grid allocates beyond it stays transparent — invisible against the
  // wallpaper instead of reading as an empty dark panel.
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

    val size = LocalSize.current
    // Clamped so an extreme cell can't render the card unreadably small or
    // comically large; the provider's own min/max resize bounds keep normal
    // use well inside this.
    val scale = minOf(
      size.width.value / BASE_CARD_WIDTH,
      size.height.value / BASE_CARD_HEIGHT,
    ).coerceIn(0.7f, 2.4f)

    val cardModifier = GlanceModifier
      .width((BASE_CARD_WIDTH * scale).dp)
      .height((BASE_CARD_HEIGHT * scale).dp)
      .cornerRadius((24f * scale).dp)
      .background(colors.cardBg)
      .padding((14f * scale).dp)
      .let { if (detail == null) it.clickable(actionStartActivity(openApp)) else it }

    Box(
      modifier = GlanceModifier.fillMaxSize(),
      contentAlignment = Alignment.Center,
    ) {
      Box(modifier = cardModifier) {
        Column(modifier = GlanceModifier.fillMaxSize()) {
          Header(colors, monthLabel, pickerOpen, iconBitmap, openApp, scale)
          Box(modifier = GlanceModifier.height((8f * scale).dp)) {}

          val bodyModifier = GlanceModifier.fillMaxWidth().defaultWeight()
          if (detail == null) {
            EmptyBody(uiState, colors, scale, bodyModifier)
          } else if (pickerOpen) {
            // The picker takes the pills' space as well — they mean nothing
            // while you're choosing an account, and with a dozen accounts
            // that space is two more visible rows.
            AccountPicker(ready.options, selectedIndex, colors, scale, bodyModifier)
          } else {
            AccountCard(detail, colors, scale, bodyModifier)
          }

          if (!pickerOpen) {
            Box(modifier = GlanceModifier.height((8f * scale).dp)) {}
            Row(modifier = GlanceModifier.fillMaxWidth()) {
              ActionPill("Income", WIDGET_INCOME, "income", detail?.id, scale, GlanceModifier.defaultWeight())
              Box(modifier = GlanceModifier.width((8f * scale).dp)) {}
              ActionPill("Expense", WIDGET_EXPENSE, "expense", detail?.id, scale, GlanceModifier.defaultWeight())
              Box(modifier = GlanceModifier.width((8f * scale).dp)) {}
              ActionPill("Transfer", WIDGET_TRANSFER, "transfer", detail?.id, scale, GlanceModifier.defaultWeight())
            }
          }
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
    scale: Float,
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
          .size((22f * scale).dp)
          .cornerRadius((6f * scale).dp)
          .let { if (pickerOpen) it else it.clickable(actionStartActivity(openApp)) },
      )
      Box(modifier = GlanceModifier.width((7f * scale).dp)) {}
      Text(
        text = "Erebor",
        maxLines = 1,
        style = TextStyle(
          fontSize = (13f * scale).sp,
          fontWeight = FontWeight.Bold,
          color = ColorProvider(colors.textPrimary),
        ),
        modifier = GlanceModifier.defaultWeight(),
      )
      Text(
        text = if (pickerOpen) "Tap to close" else monthLabel,
        maxLines = 1,
        style = TextStyle(fontSize = (12f * scale).sp, color = ColorProvider(colors.textSecondary)),
      )
    }
  }

  // The account card, mirroring one row of app/(tabs)/accounts/index.tsx.
  @Composable
  private fun AccountCard(
    detail: WidgetAccountDetail,
    colors: WidgetColors,
    scale: Float,
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
            .size((36f * scale).dp)
            .cornerRadius((18f * scale).dp)
            .background(parseAccountColor(detail.colorHex)),
          contentAlignment = Alignment.Center,
        ) {
          Image(
            provider = ImageProvider(accountTypeIcon(detail.type)),
            contentDescription = null,
            colorFilter = ColorFilter.tint(ColorProvider(Color.White)),
            modifier = GlanceModifier.size((18f * scale).dp),
          )
        }
        Box(modifier = GlanceModifier.width((10f * scale).dp)) {}
        Column(modifier = GlanceModifier.defaultWeight()) {
          Text(
            text = detail.name,
            maxLines = 1,
            style = TextStyle(
              fontSize = (15f * scale).sp,
              fontWeight = FontWeight.Medium,
              color = ColorProvider(colors.textPrimary),
            ),
          )
          // The chevron is the affordance that this row is tappable — a
          // widget has no hover or ripple to hint with. A drawable rather
          // than a "▾" glyph: font coverage of the small geometric
          // triangles isn't guaranteed across OEM skins, and a miss renders
          // as a tofu box right beside the account name.
          Row(verticalAlignment = Alignment.Vertical.CenterVertically) {
            Text(
              text = accountTypeLabel(detail.type),
              maxLines = 1,
              style = TextStyle(fontSize = (12f * scale).sp, color = ColorProvider(colors.textSecondary)),
            )
            Box(modifier = GlanceModifier.width((3f * scale).dp)) {}
            Image(
              provider = ImageProvider(R.drawable.ic_chevron_down),
              contentDescription = null,
              colorFilter = ColorFilter.tint(ColorProvider(colors.textSecondary)),
              modifier = GlanceModifier.size((12f * scale).dp),
            )
          }
        }
        Box(modifier = GlanceModifier.width((8f * scale).dp)) {}
        Column(horizontalAlignment = Alignment.Horizontal.End) {
          Text(
            text = formatMoney(detail.balanceMinor, detail.currency),
            maxLines = 1,
            style = TextStyle(
              fontSize = (16f * scale).sp,
              fontWeight = FontWeight.Bold,
              color = ColorProvider(colors.textPrimary),
            ),
          )
          // Stacked rather than inline (CurrencyAmount's other form) because
          // a widget row is far narrower than the app's, and "AED 450.00 ·
          // ≈ ₹11,627.91" on one line would truncate.
          if (detail.baseEquivalentMinor != null) {
            Text(
              text = "≈ ${formatMoney(detail.baseEquivalentMinor, detail.baseCurrency)}",
              maxLines = 1,
              style = TextStyle(fontSize = (11f * scale).sp, color = ColorProvider(colors.textSubtle)),
            )
          }
        }
      }

      // Weighted, so the divider and flow row sit against the bottom of the
      // card's body no matter how the scaled text rounds off. There is no
      // slack to pool here — the card is sized to this content.
      Box(modifier = GlanceModifier.defaultWeight()) {}
      Box(modifier = GlanceModifier.fillMaxWidth().height(1.dp).background(colors.border)) {}
      Box(modifier = GlanceModifier.height((8f * scale).dp)) {}

      Row(modifier = GlanceModifier.fillMaxWidth()) {
        FlowColumn(
          "Income",
          formatMoney(detail.incomeMinor, detail.currency),
          WIDGET_INCOME,
          colors,
          scale,
          GlanceModifier.defaultWeight(),
        )
        FlowColumn(
          "Expense",
          formatMoney(detail.expenseMinor, detail.currency),
          WIDGET_EXPENSE,
          colors,
          scale,
          GlanceModifier.defaultWeight(),
        )
        FlowColumn(
          "Transfers",
          // Net in − out, with an explicit "+" when non-negative, matching
          // the app's card exactly.
          (if (detail.netTransferMinor >= 0) "+" else "") + formatMoney(detail.netTransferMinor, detail.currency),
          if (detail.netTransferMinor >= 0) WIDGET_ACCENT_CYAN else WIDGET_EXPENSE,
          colors,
          scale,
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
    scale: Float,
    modifier: GlanceModifier,
  ) {
    Column(modifier = modifier) {
      Text(
        text = label,
        maxLines = 1,
        style = TextStyle(fontSize = (11f * scale).sp, color = ColorProvider(colors.textSecondary)),
      )
      Text(
        text = value,
        maxLines = 1,
        style = TextStyle(
          fontSize = (12f * scale).sp,
          fontWeight = FontWeight.Medium,
          color = ColorProvider(valueColor),
        ),
      )
    }
  }

  // The switcher. A LazyColumn because this is a transient mode where
  // scrolling is acceptable — unlike the resting card, whose content is
  // exactly the card's size.
  @Composable
  private fun AccountPicker(
    options: List<WidgetAccountBalance>,
    selectedIndex: Int,
    colors: WidgetColors,
    scale: Float,
    modifier: GlanceModifier,
  ) {
    LazyColumn(modifier = modifier) {
      itemsIndexed(options, itemId = { _, acct -> acct.id }) { index, acct ->
        Column {
          if (index > 0) {
            Box(modifier = GlanceModifier.fillMaxWidth().height(1.dp).background(colors.border)) {}
          }
          Row(
            // Tighter than the card's rhythm on purpose: with a dozen
            // accounts every dp of row height costs a visible entry.
            modifier = GlanceModifier
              .fillMaxWidth()
              .padding(vertical = (6f * scale).dp)
              .clickable(actionRunCallback<SelectAccountAction>(accountIndexParams(index))),
            verticalAlignment = Alignment.Vertical.CenterVertically,
          ) {
            Text(
              text = if (index == selectedIndex) "●  ${acct.name}" else "    ${acct.name}",
              maxLines = 1,
              style = TextStyle(
                fontSize = (14f * scale).sp,
                fontWeight = if (index == selectedIndex) FontWeight.Bold else FontWeight.Normal,
                color = ColorProvider(if (index == selectedIndex) WIDGET_ACCENT_CYAN else colors.textPrimary),
              ),
              modifier = GlanceModifier.defaultWeight(),
            )
            Text(
              text = formatMoney(acct.balanceMinor, acct.currency),
              maxLines = 1,
              style = TextStyle(fontSize = (13f * scale).sp, color = ColorProvider(colors.textSecondary)),
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
    scale: Float,
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
          style = TextStyle(fontSize = (13f * scale).sp, color = ColorProvider(colors.textSecondary)),
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
    scale: Float,
    modifier: GlanceModifier,
  ) {
    val uri = if (accountId != null) {
      "$DEEP_LINK_BASE?type=$type&accountId=$accountId"
    } else {
      "$DEEP_LINK_BASE?type=$type"
    }
    Box(
      modifier = modifier
        .height((36f * scale).dp)
        .cornerRadius((18f * scale).dp)
        .background(accent)
        .clickable(actionStartActivity(Intent(Intent.ACTION_VIEW, Uri.parse(uri)))),
      contentAlignment = Alignment.Center,
    ) {
      Text(
        text = "+ $label",
        maxLines = 1,
        style = TextStyle(
          fontSize = (13f * scale).sp,
          fontWeight = FontWeight.Bold,
          color = ColorProvider(Color.White),
        ),
      )
    }
  }
}
