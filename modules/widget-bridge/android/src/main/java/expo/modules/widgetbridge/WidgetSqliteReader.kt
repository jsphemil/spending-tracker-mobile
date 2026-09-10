package expo.modules.widgetbridge

import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.util.Log
import java.io.File

data class WidgetAccountBalance(
  val id: Long,
  val name: String,
  val currency: String,
  val balanceMinor: Long,
)

data class WidgetAccountOption(
  val id: Long,
  val name: String,
  val currency: String,
  val balanceMinor: Long,
)

// Everything the single-account card needs, mirroring one row of the app's
// Accounts screen (app/(tabs)/accounts/index.tsx).
//
// `baseEquivalentMinor` is null whenever there is nothing useful to show —
// either the account is already in the base currency, or no cached rate
// exists for the pair. A widget can't sensibly hit the network, so a cache
// miss omits the "≈" line rather than inventing a number.
data class WidgetAccountDetail(
  val id: Long,
  val name: String,
  val type: String,
  val colorHex: String,
  val currency: String,
  val balanceMinor: Long,
  val incomeMinor: Long,
  val expenseMinor: Long,
  val transferInMinor: Long,
  val transferOutMinor: Long,
  val baseCurrency: String,
  val baseEquivalentMinor: Long?,
) {
  /** Net transfers, the figure the app's account card shows. */
  val netTransferMinor: Long get() = transferInMinor - transferOutMinor
}

data class WidgetConfig(val accountIds: List<Long>, val opacityPct: Int)

private fun dbFile(context: Context): File = File(context.filesDir, "SQLite/spending-tracker.db")

private fun openReadOnlyDb(context: Context): SQLiteDatabase? {
  val file = dbFile(context)
  if (!file.exists()) return null
  return SQLiteDatabase.openDatabase(file.path, null, SQLiteDatabase.OPEN_READONLY)
}

// PRAGMA statements return a result row, so Android's execSQL() rejects
// them ("Queries can be performed using SQLiteDatabase query or rawQuery
// methods only") — rawQuery is required even though we discard the result.
private fun openReadWriteDb(context: Context): SQLiteDatabase =
  SQLiteDatabase.openDatabase(dbFile(context).path, null, SQLiteDatabase.OPEN_READWRITE).apply {
    rawQuery("PRAGMA busy_timeout = 3000;", null).close()
  }

// Mirrors services/balance.ts's getAccountBalanceMinor, bounded to the
// exclusive end of the *current calendar month* — the same asOfDate the
// Account Detail screen passes as `range.end` for its "Balance available"
// figure. This deliberately INCLUDES already-recorded transactions dated
// later this month (including materialized future-dated recurring ones),
// so the widget agrees with "Balance available" instead of quietly
// dropping the rest of the month's known activity like a plain "now" cutoff
// would.
private fun getAccountBalanceMinor(db: SQLiteDatabase, accountId: Long, cutoffEpochSeconds: Long): Long {
  val outgoing = db.rawQuery(
    """
    SELECT COALESCE(SUM(CASE
      WHEN type = 'income' THEN amount_minor
      WHEN type = 'expense' THEN -amount_minor
      WHEN type = 'transfer' THEN -amount_minor
      ELSE 0 END), 0)
    FROM transactions
    WHERE account_id = ? AND date < ?
    """.trimIndent(),
    arrayOf(accountId.toString(), cutoffEpochSeconds.toString()),
  ).use { cursor -> if (cursor.moveToFirst()) cursor.getLong(0) else 0L }

  val incoming = db.rawQuery(
    """
    SELECT COALESCE(SUM(amount_minor), 0)
    FROM transactions
    WHERE type = 'transfer' AND to_account_id = ? AND date < ?
    """.trimIndent(),
    arrayOf(accountId.toString(), cutoffEpochSeconds.toString()),
  ).use { cursor -> if (cursor.moveToFirst()) cursor.getLong(0) else 0L }

  return outgoing + incoming
}

// Local-calendar first-moment-of-next-month, as an exclusive upper bound —
// the native-side equivalent of services/period.ts's
// `monthRange(currentMonthPeriod()).end`. Day-of-month is reset to 1
// *before* adding a month so e.g. Jan 31 doesn't overflow into March.
private fun startOfNextMonthEpochSeconds(): Long {
  val cal = java.util.Calendar.getInstance()
  cal.set(java.util.Calendar.DAY_OF_MONTH, 1)
  cal.add(java.util.Calendar.MONTH, 1)
  cal.set(java.util.Calendar.HOUR_OF_DAY, 0)
  cal.set(java.util.Calendar.MINUTE, 0)
  cal.set(java.util.Calendar.SECOND, 0)
  cal.set(java.util.Calendar.MILLISECOND, 0)
  return cal.timeInMillis / 1000
}

// Inclusive lower bound of the current calendar month — the native
// equivalent of services/period.ts's `monthRange(currentMonthPeriod()).start`,
// pairing with startOfNextMonthEpochSeconds() above to give the same
// half-open [start, end) range the app's month figures use.
private fun startOfCurrentMonthEpochSeconds(): Long {
  val cal = java.util.Calendar.getInstance()
  cal.set(java.util.Calendar.DAY_OF_MONTH, 1)
  cal.set(java.util.Calendar.HOUR_OF_DAY, 0)
  cal.set(java.util.Calendar.MINUTE, 0)
  cal.set(java.util.Calendar.SECOND, 0)
  cal.set(java.util.Calendar.MILLISECOND, 0)
  return cal.timeInMillis / 1000
}

// This month's income / expense / transfers for one account, mirroring the
// per-account loop in app/(tabs)/accounts/index.tsx — NOT
// services/balance.ts's getPeriodTotals, which deliberately excludes
// transfers entirely and so can't produce the card's third column.
//
// Transfers are attributed from the transaction's own perspective, exactly
// as that loop does: the row's own account is the "out" side, its
// to_account_id the "in" side.
private data class MonthFlows(
  val incomeMinor: Long,
  val expenseMinor: Long,
  val transferInMinor: Long,
  val transferOutMinor: Long,
)

private fun getMonthFlows(db: SQLiteDatabase, accountId: Long): MonthFlows {
  val start = startOfCurrentMonthEpochSeconds().toString()
  val end = startOfNextMonthEpochSeconds().toString()
  val id = accountId.toString()

  val own = db.rawQuery(
    """
    SELECT
      COALESCE(SUM(CASE WHEN type = 'income'   THEN amount_minor ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN type = 'expense'  THEN amount_minor ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN type = 'transfer' THEN amount_minor ELSE 0 END), 0)
    FROM transactions
    WHERE account_id = ? AND date >= ? AND date < ?
    """.trimIndent(),
    arrayOf(id, start, end),
  ).use { cursor ->
    if (cursor.moveToFirst()) {
      Triple(cursor.getLong(0), cursor.getLong(1), cursor.getLong(2))
    } else {
      Triple(0L, 0L, 0L)
    }
  }

  val transferIn = db.rawQuery(
    """
    SELECT COALESCE(SUM(amount_minor), 0)
    FROM transactions
    WHERE type = 'transfer' AND to_account_id = ? AND date >= ? AND date < ?
    """.trimIndent(),
    arrayOf(id, start, end),
  ).use { cursor -> if (cursor.moveToFirst()) cursor.getLong(0) else 0L }

  return MonthFlows(own.first, own.second, transferIn, own.third)
}

private fun getBaseCurrency(db: SQLiteDatabase): String =
  db.rawQuery("SELECT base_currency FROM settings LIMIT 1", null).use { cursor ->
    if (cursor.moveToFirst()) cursor.getString(0) ?: "INR" else "INR"
  }

// Cache-only conversion into the app's base currency.
//
// Note exchange_rate_cache's columns read backwards from their names:
// services/currency.ts stores rows with base_currency = the FOREIGN
// currency, target_currency = the app's base, and rate meaning
// "1 foreign = rate base". Newest row wins; a miss returns null and the
// caller omits the "≈" line, because a widget has no business making a
// network call and a stale-guess figure is worse than none.
private fun getBaseEquivalentMinor(
  db: SQLiteDatabase,
  amountMinor: Long,
  currency: String,
  baseCurrency: String,
): Long? {
  if (currency.equals(baseCurrency, ignoreCase = true)) return null
  val rate = db.rawQuery(
    """
    SELECT rate FROM exchange_rate_cache
    WHERE base_currency = ? AND target_currency = ?
    ORDER BY fetched_at DESC LIMIT 1
    """.trimIndent(),
    arrayOf(currency, baseCurrency),
  ).use { cursor -> if (cursor.moveToFirst()) cursor.getDouble(0) else null } ?: return null

  // Round-trips through major units the same way hooks/useBaseCurrencyEquivalent
  // does, so a zero-decimal currency scales correctly in both directions.
  val major = amountMinor / Math.pow(10.0, minorUnitsFor(currency).toDouble())
  val baseMajor = major * rate
  return Math.round(baseMajor * Math.pow(10.0, minorUnitsFor(baseCurrency).toDouble()))
}

// The full card for one account. Returns null when the database can't be
// read or the account no longer exists — the caller distinguishes that from
// "no accounts configured", same reasoning as getAccountsForWidget below.
fun getAccountDetailForWidget(context: Context, accountId: Long): WidgetAccountDetail? {
  val db = openReadOnlyDb(context) ?: return null
  try {
    val row = db.rawQuery(
      "SELECT id, name, type, color, currency FROM accounts WHERE id = ?",
      arrayOf(accountId.toString()),
    ).use { cursor ->
      if (!cursor.moveToFirst()) return null
      listOf(
        cursor.getLong(0).toString(),
        cursor.getString(1),
        cursor.getString(2),
        cursor.getString(3),
        cursor.getString(4),
      )
    }

    val currency = row[4]
    val balance = getAccountBalanceMinor(db, accountId, startOfNextMonthEpochSeconds())
    val flows = getMonthFlows(db, accountId)
    val baseCurrency = getBaseCurrency(db)

    return WidgetAccountDetail(
      id = accountId,
      name = row[1],
      type = row[2],
      colorHex = row[3],
      currency = currency,
      balanceMinor = balance,
      incomeMinor = flows.incomeMinor,
      expenseMinor = flows.expenseMinor,
      transferInMinor = flows.transferInMinor,
      transferOutMinor = flows.transferOutMinor,
      baseCurrency = baseCurrency,
      baseEquivalentMinor = getBaseEquivalentMinor(db, balance, currency, baseCurrency),
    )
  } catch (error: Exception) {
    Log.w("WidgetBridge", "Could not load account detail for id=$accountId", error)
    return null
  } finally {
    db.close()
  }
}

// Preserves the order accountIds was given in (the user's picked order
// from configuration), not whatever order the DB returns — and silently
// drops any id whose account was since deleted, so deleting a shown
// account degrades to one fewer row instead of crashing the widget.
//
// Returns null when the database itself can't be read (not yet created on
// a fresh install, or an open/query failure). That is deliberately NOT the
// same value as an empty list: the caller must be able to tell "we could
// not load balances" apart from "this widget legitimately has no accounts
// to show", because rendering the former as the latter is how a transient
// read failure turns into a widget that looks permanently empty.
fun getAccountsForWidget(context: Context, accountIds: List<Long>): List<WidgetAccountBalance>? {
  if (accountIds.isEmpty()) return emptyList()
  val db = openReadOnlyDb(context) ?: return null
  try {
    val cutoffEpochSeconds = startOfNextMonthEpochSeconds()
    val placeholders = accountIds.joinToString(",") { "?" }
    val args = accountIds.map { it.toString() }.toTypedArray()
    val byId = mutableMapOf<Long, Pair<String, String>>()
    db.rawQuery("SELECT id, name, currency FROM accounts WHERE id IN ($placeholders)", args).use { cursor ->
      while (cursor.moveToNext()) {
        byId[cursor.getLong(0)] = cursor.getString(1) to cursor.getString(2)
      }
    }
    return accountIds.mapNotNull { id ->
      val (name, currency) = byId[id] ?: return@mapNotNull null
      WidgetAccountBalance(id, name, currency, getAccountBalanceMinor(db, id, cutoffEpochSeconds))
    }
  } finally {
    db.close()
  }
}

fun getAllAccountsForConfig(context: Context): List<WidgetAccountOption> {
  val db = openReadOnlyDb(context) ?: return emptyList()
  try {
    val cutoffEpochSeconds = startOfNextMonthEpochSeconds()
    val result = mutableListOf<WidgetAccountOption>()
    db.rawQuery("SELECT id, name, currency FROM accounts ORDER BY sort_order ASC, id ASC", null).use { cursor ->
      while (cursor.moveToNext()) {
        val id = cursor.getLong(0)
        val name = cursor.getString(1)
        val currency = cursor.getString(2)
        result.add(WidgetAccountOption(id, name, currency, getAccountBalanceMinor(db, id, cutoffEpochSeconds)))
      }
    }
    return result
  } finally {
    db.close()
  }
}

// account_ids_json is always a flat JSON array of numbers written by
// saveWidgetConfig below, so a hand-rolled parser avoids pulling in a
// JSON library for one shape.
private fun parseIdsJson(json: String): List<Long> {
  val trimmed = json.trim().removePrefix("[").removeSuffix("]")
  if (trimmed.isBlank()) return emptyList()
  return trimmed.split(",").mapNotNull { it.trim().toLongOrNull() }
}

// Read-only, and only used to migrate installs configured before widget
// configuration moved into Glance's per-widget state store — see
// WidgetConfigStore.kt for why it moved. Nothing writes this table any
// more; WidgetConfigStore is the single source of truth for selections.
//
// Returns null for both "no database" and "no row", which the caller
// treats as "nothing to migrate". Neither case can be confused with a
// real selection, because a real selection always carries configured=true
// in Glance state.
fun getLegacyWidgetConfig(context: Context, appWidgetId: Int): WidgetConfig? {
  val db = openReadOnlyDb(context) ?: return null
  try {
    db.rawQuery(
      "SELECT account_ids_json, opacity_pct FROM widget_account_selections WHERE widget_id = ?",
      arrayOf(appWidgetId.toString()),
    ).use { cursor ->
      if (!cursor.moveToFirst()) return null
      return WidgetConfig(parseIdsJson(cursor.getString(0)), cursor.getInt(1))
    }
  } catch (error: Exception) {
    // A legacy table that no longer exists (or any other read failure) just
    // means there is nothing to migrate — never fail widget rendering here.
    return null
  } finally {
    db.close()
  }
}

// Removes the pre-migration row for a deleted widget. Glance deletes its
// own per-widget state store automatically on delete, so this only cleans
// up the legacy table. Best-effort: a widget being removed must never
// surface an error, and there may be no row (or no table) to delete.
fun deleteLegacyWidgetConfig(context: Context, appWidgetId: Int) {
  try {
    val db = openReadWriteDb(context)
    try {
      db.execSQL("DELETE FROM widget_account_selections WHERE widget_id = ?", arrayOf(appWidgetId))
    } finally {
      db.close()
    }
  } catch (error: Exception) {
    Log.w("WidgetBridge", "Could not clean up legacy widget config for id=$appWidgetId", error)
  }
}

private val ZERO_DECIMAL_CURRENCIES = setOf("JPY", "KRW", "VND")

private fun minorUnitsFor(currency: String): Int = if (ZERO_DECIMAL_CURRENCIES.contains(currency.uppercase())) 0 else 2

private val CURRENCY_SYMBOLS = mapOf(
  "INR" to "₹", "USD" to "$", "EUR" to "€", "GBP" to "£", "AED" to "AED ", "JPY" to "¥",
)

private fun currencySymbol(currency: String): String = CURRENCY_SYMBOLS[currency.uppercase()] ?: "${currency.uppercase()} "

// Mirrors services/format.ts's formatMoney — Indian digit grouping
// (₹1,53,168.00) via the en-IN ICU locale.
fun formatMoney(amountMinor: Long, currency: String): String {
  val decimals = minorUnitsFor(currency)
  val major = amountMinor / Math.pow(10.0, decimals.toDouble())
  val nf = java.text.NumberFormat.getNumberInstance(java.util.Locale("en", "IN"))
  nf.minimumFractionDigits = decimals
  nf.maximumFractionDigits = decimals
  val formatted = nf.format(kotlin.math.abs(major))
  val sign = if (major < 0) "-" else ""
  return "$sign${currencySymbol(currency)}$formatted"
}
