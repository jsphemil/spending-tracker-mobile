package expo.modules.widgetbridge

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import androidx.datastore.preferences.core.MutablePreferences
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.glance.GlanceId
import androidx.glance.appwidget.GlanceAppWidgetManager
import androidx.glance.appwidget.state.getAppWidgetState
import androidx.glance.appwidget.state.updateAppWidgetState
import androidx.glance.state.PreferencesGlanceStateDefinition

// Per-widget configuration lives in Glance's own state store (a DataStore
// file per appWidgetId), NOT in the app's SQLite database.
//
// This is a deliberate split, not a style preference:
//
//   widget configuration (which accounts, opacity)  -> Glance state
//   accounts / transactions / balances              -> SQLite
//
// The reason is lifecycle correctness. A Glance session calls
// provideGlance() exactly once and then parks forever inside
// provideContent() (its Kotlin return type is Nothing). Anything read into
// a plain local before provideContent is captured immutably for the whole
// session, so a later update() only recomposes that same captured data and
// can never show a newer value. Glance state, read through currentState(),
// is observable Compose state: writing it invalidates the composition, so
// an update() genuinely re-renders. SQLite is not observable and cannot do
// that on its own.
//
// Glance also keys this store per widget instance and deletes it when the
// widget is removed, which is exactly the ownership model widget config
// needs. Balances stay in SQLite, which remains their single source of
// truth; they are re-read whenever the observable config below changes.

internal const val DEFAULT_OPACITY_PCT = 85

// Set once the user has actually completed the configuration screen. Kept
// separate from the id list so "never configured" stays distinguishable
// from "configured with zero accounts selected" — those must not render
// the same way.
internal val KEY_CONFIGURED = booleanPreferencesKey("configured")

// Comma-joined, order-preserving. Deliberately a String and not a
// Preferences Set<String>: a Set has no ordering, and the widget renders
// accounts in the order the user picked them.
internal val KEY_ACCOUNT_IDS = stringPreferencesKey("account_ids")

internal val KEY_OPACITY_PCT = intPreferencesKey("opacity_pct")

// Bumped whenever the underlying account/transaction data changes (see
// WidgetBridgeModule.refreshAccountsWidget). The account id list alone
// can't drive a balance refresh — the ids are identical, only the balances
// behind them moved — so this counter is what invalidates the composition
// and forces a re-read of SQLite.
internal val KEY_DATA_VERSION = intPreferencesKey("data_version")

internal fun encodeAccountIds(ids: List<Long>): String = ids.joinToString(",")

internal fun decodeAccountIds(raw: String?): List<Long> =
  raw?.split(",")?.mapNotNull { it.trim().toLongOrNull() } ?: emptyList()

internal data class WidgetSelection(
  val configured: Boolean,
  val accountIds: List<Long>,
  val opacityPct: Int,
)

internal fun Preferences.readSelection(): WidgetSelection = WidgetSelection(
  configured = this[KEY_CONFIGURED] ?: false,
  accountIds = decodeAccountIds(this[KEY_ACCOUNT_IDS]),
  opacityPct = this[KEY_OPACITY_PCT] ?: DEFAULT_OPACITY_PCT,
)

internal fun MutablePreferences.writeSelection(accountIds: List<Long>, opacityPct: Int) {
  this[KEY_CONFIGURED] = true
  this[KEY_ACCOUNT_IDS] = encodeAccountIds(accountIds)
  this[KEY_OPACITY_PCT] = opacityPct
  bumpDataVersion()
}

internal fun MutablePreferences.bumpDataVersion() {
  this[KEY_DATA_VERSION] = (this[KEY_DATA_VERSION] ?: 0) + 1
}

// Resolved straight from the platform rather than
// GlanceAppWidgetManager.getGlanceIds(), which is backed by a DataStore of
// known receivers that only gets populated once GlanceAppWidgetReceiver has
// handled an update. A widget being configured for the very first time may
// not be in that map yet, so getGlanceIds() can return an empty list and
// make updateAll() a silent no-op. AppWidgetManager always knows.
internal fun boundAppWidgetIds(context: Context): IntArray =
  AppWidgetManager.getInstance(context).getAppWidgetIds(
    ComponentName(context, AccountsGlanceWidgetReceiver::class.java),
  )

internal fun glanceIdFor(context: Context, appWidgetId: Int): GlanceId =
  GlanceAppWidgetManager(context).getGlanceIdBy(appWidgetId)

internal suspend fun readSelection(context: Context, glanceId: GlanceId): WidgetSelection =
  getAppWidgetState(context, PreferencesGlanceStateDefinition, glanceId).readSelection()

internal suspend fun saveSelection(
  context: Context,
  glanceId: GlanceId,
  accountIds: List<Long>,
  opacityPct: Int,
) {
  updateAppWidgetState(context, glanceId) { prefs -> prefs.writeSelection(accountIds, opacityPct) }
}

// Installs from before configuration moved into Glance state still have
// their selection only in SQLite's widget_account_selections. Seed the
// Glance state from that row once, so an already-placed widget keeps
// working across the upgrade instead of resetting to unconfigured.
internal suspend fun migrateLegacySelectionIfNeeded(
  context: Context,
  glanceId: GlanceId,
  appWidgetId: Int,
) {
  if (readSelection(context, glanceId).configured) return
  val legacy = getLegacyWidgetConfig(context, appWidgetId) ?: return
  saveSelection(context, glanceId, legacy.accountIds, legacy.opacityPct)
}
