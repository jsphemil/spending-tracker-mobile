package expo.modules.widgetbridge

import android.app.Activity
import android.appwidget.AppWidgetManager
import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.appwidget.state.getAppWidgetState
import androidx.glance.appwidget.state.updateAppWidgetState
import androidx.glance.state.PreferencesGlanceStateDefinition
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

// Same dark tokens as AccountsWidgetConfigActivity.
private val CfgBg = Color(0xFF050505)
private val CfgSurface = Color(0xFF1F1F1F)
private val CfgFg = Color(0xFFF2F2F3)
private val CfgFgMuted = Color(0xFFA9A9AC)
private val CfgAccent = Color(0xFF5C8DFF)
private val CfgAccentFill = Color(0xFF0D51FB)

// Customise screen for the Safe to Spend widget, opened from the launcher's
// long-press "Customise" (configuration_optional: placing the widget skips
// it and uses the defaults). Opacity is per widget
// (Glance state); the account ticks are the app's own per-account "Count
// toward Safe to Spend" setting, so the Dashboard card and every Safe to
// Spend widget always agree.
class SafeToSpendWidgetConfigActivity : ComponentActivity() {
  private var appWidgetId = AppWidgetManager.INVALID_APPWIDGET_ID
  private var saving = false

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    setResult(Activity.RESULT_CANCELED)
    appWidgetId = intent?.extras?.getInt(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
      ?: AppWidgetManager.INVALID_APPWIDGET_ID
    if (appWidgetId == AppWidgetManager.INVALID_APPWIDGET_ID) {
      finish()
      return
    }

    lifecycleScope.launch {
      val context = this@SafeToSpendWidgetConfigActivity
      val opacity = try {
        getAppWidgetState(context, PreferencesGlanceStateDefinition, glanceIdFor(context, appWidgetId))[KEY_OPACITY_PCT]
      } catch (error: Exception) {
        Log.w("WidgetBridge", "Could not read Safe to Spend widget state", error)
        null
      } ?: SAFE_TO_SPEND_DEFAULT_OPACITY_PCT
      val options = withContext(Dispatchers.IO) { getSafeToSpendOptions(context) }
      setContent {
        SafeToSpendConfigScreen(options, opacity) { counted, opacityPct -> save(options, counted, opacityPct) }
      }
    }
  }

  private fun save(options: List<SafeToSpendOption>, counted: Set<Long>, opacityPct: Int) {
    if (saving) return
    saving = true
    lifecycleScope.launch {
      val context = this@SafeToSpendWidgetConfigActivity
      val changes = options.filter { (it.id in counted) != it.counts }.associate { it.id to (it.id in counted) }
      try {
        withContext(Dispatchers.IO) { setSafeToSpendFlags(context, changes) }
      } catch (error: Exception) {
        // e.g. the app holding a long write lock. Nothing was written (one
        // transaction), so say so and let the user try again.
        Log.w("WidgetBridge", "Could not save Safe to Spend accounts", error)
        Toast.makeText(context, "Couldn't save — please try again", Toast.LENGTH_SHORT).show()
        saving = false
        return@launch
      }

      // Opacity is this widget's own; the account change affects every Safe
      // to Spend widget, so all of them re-read.
      updateAppWidgetState(context, glanceIdFor(context, appWidgetId)) { it[KEY_OPACITY_PCT] = opacityPct }
      boundAppWidgetIds(context, SafeToSpendGlanceWidgetReceiver::class.java).forEach { id ->
        val glanceId = glanceIdFor(context, id)
        updateAppWidgetState(context, glanceId) { it.bumpDataVersion() }
        SafeToSpendGlanceWidget().update(context, glanceId)
      }

      setResult(Activity.RESULT_OK, Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId))
      finish()
    }
  }
}

@Composable
private fun SafeToSpendConfigScreen(
  options: List<SafeToSpendOption>,
  initialOpacityPct: Int,
  onSave: (Set<Long>, Int) -> Unit,
) {
  // Saveable so a rotation keeps unsaved changes (ids as a LongArray).
  var countedIds by rememberSaveable { mutableStateOf(options.filter { it.counts }.map { it.id }.toLongArray()) }
  val counted = countedIds.toSet()
  var opacityPct by rememberSaveable { mutableStateOf(initialOpacityPct.toFloat()) }

  Column(modifier = Modifier.fillMaxSize().background(CfgBg).padding(top = 48.dp)) {
    Text(
      "Safe to Spend widget",
      color = CfgFg,
      fontSize = 20.sp,
      fontWeight = FontWeight.Bold,
      modifier = Modifier.padding(horizontal = 20.dp),
    )
    Spacer(Modifier.height(4.dp))
    Text(
      "Accounts that count toward Safe to Spend. This is the same setting as in the app, so the Dashboard changes too.",
      color = CfgFgMuted,
      fontSize = 13.sp,
      modifier = Modifier.padding(horizontal = 20.dp),
    )
    Spacer(Modifier.height(16.dp))

    if (options.isEmpty()) {
      Text(
        "Open Erebor and add an account first.",
        color = CfgFgMuted,
        fontSize = 14.sp,
        modifier = Modifier.padding(horizontal = 20.dp).weight(1f),
      )
    } else {
      LazyColumn(
        modifier = Modifier.weight(1f),
        contentPadding = PaddingValues(horizontal = 20.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
      ) {
        items(options, key = { it.id }) { opt ->
          val on = opt.id in counted
          Row(
            modifier = Modifier
              .fillMaxWidth()
              .clip(RoundedCornerShape(12.dp))
              .background(CfgSurface)
              .clickable(role = Role.Checkbox) {
                countedIds = (if (on) counted - opt.id else counted + opt.id).toLongArray()
              }
              .semantics {
                contentDescription = opt.name
                stateDescription = if (on) "Counted" else "Not counted"
              }
              .padding(vertical = 12.dp, horizontal = 14.dp),
            verticalAlignment = Alignment.CenterVertically,
          ) {
            Box(
              Modifier.size(20.dp).clip(RoundedCornerShape(6.dp)).background(if (on) CfgAccent else Color(0xFF343537)),
            )
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
              Text(opt.name, color = CfgFg, fontSize = 15.sp, fontWeight = FontWeight.Medium, maxLines = 1)
              Text(typeLabel(opt.type), color = CfgFgMuted, fontSize = 12.sp)
            }
          }
        }
      }
    }

    Column(Modifier.padding(horizontal = 20.dp, vertical = 16.dp)) {
      Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text("Background opacity", color = CfgFg, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
        Text("${opacityPct.toInt()}%", color = CfgFgMuted, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
      }
      Slider(
        value = opacityPct,
        onValueChange = { opacityPct = it },
        valueRange = 0f..100f,
        colors = SliderDefaults.colors(thumbColor = CfgAccent, activeTrackColor = CfgAccent),
      )
    }

    Box(Modifier.padding(20.dp)) {
      Row(
        modifier = Modifier
          .fillMaxWidth()
          .clip(RoundedCornerShape(14.dp))
          .background(CfgAccentFill)
          .clickable(role = Role.Button) { onSave(counted, opacityPct.toInt()) }
          .padding(vertical = 14.dp),
        horizontalArrangement = Arrangement.Center,
      ) {
        Text("Save", color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
      }
    }
  }
}

// constants/accountTypes.ts's ACCOUNT_TYPE_LABELS.
private fun typeLabel(type: String): String = when (type) {
  "savings" -> "Savings"
  "investment" -> "Investment"
  "deposit" -> "Deposit"
  "wallet" -> "Wallet / Cash"
  "credit_card" -> "Credit Card"
  else -> type
}
