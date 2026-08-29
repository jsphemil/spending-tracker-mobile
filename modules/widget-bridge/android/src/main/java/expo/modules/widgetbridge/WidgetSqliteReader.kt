package expo.modules.widgetbridge

import android.content.Context
import android.database.sqlite.SQLiteDatabase
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
// drops any id whose account was since deleted, same as the JS version did.
fun getAccountsForWidget(context: Context, accountIds: List<Long>): List<WidgetAccountBalance> {
  if (accountIds.isEmpty()) return emptyList()
  val db = openReadOnlyDb(context) ?: return emptyList()
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

fun getWidgetConfig(context: Context, appWidgetId: Int): WidgetConfig {
  val db = openReadOnlyDb(context) ?: return WidgetConfig(emptyList(), 85)
  try {
    db.rawQuery(
      "SELECT account_ids_json, opacity_pct FROM widget_account_selections WHERE widget_id = ?",
      arrayOf(appWidgetId.toString()),
    ).use { cursor ->
      if (!cursor.moveToFirst()) return WidgetConfig(emptyList(), 85)
      return WidgetConfig(parseIdsJson(cursor.getString(0)), cursor.getInt(1))
    }
  } finally {
    db.close()
  }
}

fun saveWidgetConfig(context: Context, appWidgetId: Int, accountIds: List<Long>, opacityPct: Int) {
  val db = openReadWriteDb(context)
  try {
    val json = "[${accountIds.joinToString(",")}]"
    db.execSQL(
      """
      INSERT INTO widget_account_selections (widget_id, account_ids_json, opacity_pct)
      VALUES (?, ?, ?)
      ON CONFLICT(widget_id) DO UPDATE SET account_ids_json = excluded.account_ids_json, opacity_pct = excluded.opacity_pct
      """.trimIndent(),
      arrayOf(appWidgetId, json, opacityPct),
    )
  } finally {
    db.close()
  }
}

fun deleteWidgetConfig(context: Context, appWidgetId: Int) {
  val db = openReadWriteDb(context)
  try {
    db.execSQL("DELETE FROM widget_account_selections WHERE widget_id = ?", arrayOf(appWidgetId))
  } finally {
    db.close()
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
