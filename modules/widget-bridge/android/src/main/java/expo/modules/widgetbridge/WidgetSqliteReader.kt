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

// Mirrors services/balance.ts's getAccountBalanceMinor, bounded to "now"
// so the widget shows the same "current balance" the rest of the app
// does — not the lifetime total, which would include already-materialized
// future-dated recurring transactions.
private fun getAccountBalanceMinor(db: SQLiteDatabase, accountId: Long, nowEpochSeconds: Long): Long {
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
    arrayOf(accountId.toString(), nowEpochSeconds.toString()),
  ).use { cursor -> if (cursor.moveToFirst()) cursor.getLong(0) else 0L }

  val incoming = db.rawQuery(
    """
    SELECT COALESCE(SUM(amount_minor), 0)
    FROM transactions
    WHERE type = 'transfer' AND to_account_id = ? AND date < ?
    """.trimIndent(),
    arrayOf(accountId.toString(), nowEpochSeconds.toString()),
  ).use { cursor -> if (cursor.moveToFirst()) cursor.getLong(0) else 0L }

  return outgoing + incoming
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
    val nowEpochSeconds = System.currentTimeMillis() / 1000
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
      WidgetAccountBalance(id, name, currency, getAccountBalanceMinor(db, id, nowEpochSeconds))
    }
  } finally {
    db.close()
  }
}

fun getAllAccountsForConfig(context: Context): List<WidgetAccountOption> {
  val db = openReadOnlyDb(context) ?: return emptyList()
  try {
    val nowEpochSeconds = System.currentTimeMillis() / 1000
    val result = mutableListOf<WidgetAccountOption>()
    db.rawQuery("SELECT id, name, currency FROM accounts ORDER BY sort_order ASC, id ASC", null).use { cursor ->
      while (cursor.moveToNext()) {
        val id = cursor.getLong(0)
        val name = cursor.getString(1)
        val currency = cursor.getString(2)
        result.add(WidgetAccountOption(id, name, currency, getAccountBalanceMinor(db, id, nowEpochSeconds)))
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
