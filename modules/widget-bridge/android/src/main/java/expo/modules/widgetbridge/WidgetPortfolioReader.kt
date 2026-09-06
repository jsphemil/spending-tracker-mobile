package expo.modules.widgetbridge

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import java.io.File
import java.util.Calendar

// Mirrors WidgetConfigStore.kt's own boundAppWidgetIds (resolved from
// AppWidgetManager directly, not GlanceAppWidgetManager.getGlanceIds(),
// which can be empty on a widget's first bind) but for the Cash Flow
// widget's own receiver -- a separate tiny function rather than adding a
// receiver-class parameter to the existing one, so that file's existing
// call sites and signature never need to change.
internal fun boundCashFlowWidgetIds(context: Context): IntArray =
  AppWidgetManager.getInstance(context).getAppWidgetIds(
    ComponentName(context, CashFlowGlanceWidgetReceiver::class.java),
  )

// Whole-portfolio (all accounts, base-currency) reads for the Monthly
// Cash Flow and Net Worth widgets -- neither has a config screen, both
// aggregate every account the same way. Kept separate from
// WidgetSqliteReader.kt (the existing Accounts & Quick Add widget's own
// reader) rather than reaching into it, including one small intentional
// duplication (accountBalanceAsOfMinor mirrors that file's own
// getAccountBalanceMinor) so the existing widget's file never needs to
// change visibility or shape to support this one.

private fun portfolioDbFile(context: Context): File = File(context.filesDir, "SQLite/spending-tracker.db")

private fun openReadOnlyPortfolioDb(context: Context): SQLiteDatabase? {
  val file = portfolioDbFile(context)
  if (!file.exists()) return null
  return SQLiteDatabase.openDatabase(file.path, null, SQLiteDatabase.OPEN_READONLY)
}

internal data class PortfolioAccount(val id: Long, val currency: String, val type: String)

internal fun readBaseCurrency(db: SQLiteDatabase): String =
  db.rawQuery("SELECT base_currency FROM settings WHERE id = 1", null).use { cursor ->
    if (cursor.moveToFirst()) cursor.getString(0) else "INR"
  }

internal fun readPortfolioAccounts(db: SQLiteDatabase): List<PortfolioAccount> {
  val result = mutableListOf<PortfolioAccount>()
  db.rawQuery("SELECT id, currency, type FROM accounts", null).use { cursor ->
    while (cursor.moveToNext()) {
      result.add(PortfolioAccount(cursor.getLong(0), cursor.getString(1), cursor.getString(2)))
    }
  }
  return result
}

// Mirrors WidgetSqliteReader.kt's own getAccountBalanceMinor exactly
// (same query shape), duplicated rather than shared so that file never
// needs a visibility change to support this one.
internal fun accountBalanceAsOfMinor(db: SQLiteDatabase, accountId: Long, cutoffEpochSeconds: Long): Long {
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

// Rates are cached keyed by (foreign currency -> live base currency), the
// same shape services/currency.ts's getRatesToBase writes. Best-effort,
// read-only, offline: if nothing is cached for a currency yet, that
// account's amounts are excluded from the aggregate rather than assumed
// 1:1 -- consistent with the app's own "disclose what couldn't convert"
// philosophy (services/currency.ts, hooks/useBaseConverter.ts), even
// though a widget has no room to render that disclosure text itself.
internal class RateConverter(private val db: SQLiteDatabase, private val baseCurrency: String) {
  private val cache = mutableMapOf<String, Double?>()

  private fun rateFor(currency: String): Double? = cache.getOrPut(currency) {
    if (currency == baseCurrency) return@getOrPut 1.0
    db.rawQuery(
      "SELECT rate FROM exchange_rate_cache WHERE base_currency = ? AND target_currency = ? ORDER BY fetched_at DESC LIMIT 1",
      arrayOf(currency, baseCurrency),
    ).use { cursor -> if (cursor.moveToFirst()) cursor.getDouble(0) else null }
  }

  // Returns null (excluded, not zero) when there is no cached rate yet.
  fun toBaseMinor(amountMinor: Long, currency: String): Long? {
    val rate = rateFor(currency) ?: return null
    return Math.round(amountMinor * rate)
  }
}

internal fun startOfCurrentMonthEpochSeconds(): Long {
  val cal = Calendar.getInstance()
  cal.set(Calendar.DAY_OF_MONTH, 1)
  cal.set(Calendar.HOUR_OF_DAY, 0)
  cal.set(Calendar.MINUTE, 0)
  cal.set(Calendar.SECOND, 0)
  cal.set(Calendar.MILLISECOND, 0)
  return cal.timeInMillis / 1000
}

internal fun startOfTodayEpochSeconds(): Long {
  val cal = Calendar.getInstance()
  cal.set(Calendar.HOUR_OF_DAY, 0)
  cal.set(Calendar.MINUTE, 0)
  cal.set(Calendar.SECOND, 0)
  cal.set(Calendar.MILLISECOND, 0)
  return cal.timeInMillis / 1000
}

internal fun startOfTomorrowEpochSeconds(): Long {
  val cal = Calendar.getInstance()
  cal.set(Calendar.HOUR_OF_DAY, 0)
  cal.set(Calendar.MINUTE, 0)
  cal.set(Calendar.SECOND, 0)
  cal.set(Calendar.MILLISECOND, 0)
  cal.add(Calendar.DAY_OF_MONTH, 1)
  return cal.timeInMillis / 1000
}

internal data class FlowTotals(val incomeMinor: Long, val expenseMinor: Long)

// Income/expense only, for [startEpoch, endEpoch) -- transfers are
// deliberately excluded. A transfer between two of the user's own
// accounts never crosses the boundary between "my accounts" and the
// outside world: its two legs cancel to exactly zero across the whole
// portfolio by construction, so counting either leg as inflow/outflow
// would double-count internal movement as if new money had appeared or
// left. This mirrors services/balance.ts's getPeriodTotals, which
// excludes transfers for the exact same reason ("money entering or
// leaving the tracked accounts as a whole, not internal moves between
// them") -- confirmed as a real bug during on-device testing 2026-09-06,
// where transferring between two accounts wrongly inflated both Inflow
// and Outflow.
private fun flowTotals(db: SQLiteDatabase, converter: RateConverter, startEpoch: Long, endEpoch: Long): FlowTotals {
  var income = 0L
  var expense = 0L

  db.rawQuery(
    """
    SELECT t.type, t.amount_minor, a.currency
    FROM transactions t JOIN accounts a ON a.id = t.account_id
    WHERE t.date >= ? AND t.date < ? AND t.type IN ('income', 'expense')
    """.trimIndent(),
    arrayOf(startEpoch.toString(), endEpoch.toString()),
  ).use { cursor ->
    while (cursor.moveToNext()) {
      val type = cursor.getString(0)
      val amountMinor = cursor.getLong(1)
      val currency = cursor.getString(2)
      val baseAmount = converter.toBaseMinor(amountMinor, currency) ?: continue
      if (type == "income") income += baseAmount else expense += baseAmount
    }
  }

  return FlowTotals(income, expense)
}

internal data class CashFlowData(
  val baseCurrency: String,
  val inflowMinor: Long,
  val outflowMinor: Long,
  val remainingMinor: Long,
  val todayIncomeMinor: Long,
  val todayExpenseMinor: Long,
)

// Whole-portfolio carry forward = sum of every account's own balance as
// of the start of the current month, each converted to base currency --
// same accountBalanceAsOfMinor the existing widget's balance math mirrors
// from services/balance.ts, just summed across every account instead of
// one.
internal fun getCashFlowData(context: Context): CashFlowData? {
  val db = openReadOnlyPortfolioDb(context) ?: return null
  try {
    val baseCurrency = readBaseCurrency(db)
    val converter = RateConverter(db, baseCurrency)
    val accounts = readPortfolioAccounts(db)

    val monthStart = startOfCurrentMonthEpochSeconds()
    val todayStart = startOfTodayEpochSeconds()
    val tomorrowStart = startOfTomorrowEpochSeconds()

    val carryForwardMinor = accounts.sumOf { account ->
      converter.toBaseMinor(accountBalanceAsOfMinor(db, account.id, monthStart), account.currency) ?: 0L
    }

    val month = flowTotals(db, converter, monthStart, tomorrowStart)
    val today = flowTotals(db, converter, todayStart, tomorrowStart)

    val inflowMinor: Long
    val outflowMinor: Long
    if (carryForwardMinor >= 0) {
      inflowMinor = carryForwardMinor + month.incomeMinor
      outflowMinor = month.expenseMinor
    } else {
      inflowMinor = month.incomeMinor
      outflowMinor = -carryForwardMinor + month.expenseMinor
    }

    return CashFlowData(
      baseCurrency = baseCurrency,
      inflowMinor = inflowMinor,
      outflowMinor = outflowMinor,
      remainingMinor = inflowMinor - outflowMinor,
      todayIncomeMinor = today.incomeMinor,
      todayExpenseMinor = today.expenseMinor,
    )
  } finally {
    db.close()
  }
}
