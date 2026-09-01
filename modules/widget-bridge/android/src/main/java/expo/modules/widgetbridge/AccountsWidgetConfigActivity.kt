package expo.modules.widgetbridge

import android.app.Activity
import android.appwidget.AppWidgetManager
import android.content.Intent
import android.os.Bundle
import android.util.Log
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
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.appwidget.updateAll
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.launch

private val ColorBg = Color(0xFF0C1120)
private val ColorSurface = Color(0xFF131A2C)
private val ColorFg = Color(0xFFF6F8FC)
private val ColorFgMuted = Color(0xFF97A1BC)
private val ColorAccent = Color(0xFF48E7F5)

// Matches theme/gradients.ts's GRADIENTS.brand — the app's real primary
// button (components/ui/Button.tsx) is a diagonal cyan-blue-violet
// gradient with white text, not a flat accent fill.
private val AccentGradient = Brush.linearGradient(
  colors = listOf(Color(0xFF48E7F5), Color(0xFF4C7DFF), Color(0xFF6E5CFF)),
)

class AccountsWidgetConfigActivity : ComponentActivity() {
  private var appWidgetId = AppWidgetManager.INVALID_APPWIDGET_ID

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    setResult(Activity.RESULT_CANCELED)

    appWidgetId = intent?.extras?.getInt(
      AppWidgetManager.EXTRA_APPWIDGET_ID,
      AppWidgetManager.INVALID_APPWIDGET_ID,
    ) ?: AppWidgetManager.INVALID_APPWIDGET_ID

    if (appWidgetId == AppWidgetManager.INVALID_APPWIDGET_ID) {
      finish()
      return
    }

    val initialConfig = getWidgetConfig(this, appWidgetId)
    val accounts = getAllAccountsForConfig(this)

    setContent {
      ConfigScreen(
        accounts = accounts,
        initialSelected = initialConfig.accountIds.toSet(),
        initialOpacityPct = initialConfig.opacityPct,
        onSave = { selectedIds, opacityPct -> saveAndFinish(selectedIds, opacityPct) },
      )
    }
  }

  private fun saveAndFinish(selectedIds: List<Long>, opacityPct: Int) {
    Log.d(TAG, "saveAndFinish: appWidgetId=$appWidgetId selectedIds=$selectedIds opacityPct=$opacityPct")
    saveWidgetConfig(this, appWidgetId, selectedIds, opacityPct)
    Log.d(TAG, "saveAndFinish: saveWidgetConfig done, readback=${getWidgetConfig(this, appWidgetId)}")

    lifecycleScope.launch {
      // updateAll(), not update(context, getGlanceIdBy(appWidgetId)) — right after
      // a widget's very first bind, Glance's internal GlanceId registry hasn't
      // necessarily processed this appWidgetId yet, making getGlanceIdBy
      // silently miss (no crash, just a no-op refresh). updateAll() refreshes
      // every placed instance without needing to resolve a specific id, so the
      // freshly-saved selection renders immediately instead of waiting for the
      // next scheduled 30-minute update.
      Log.d(TAG, "saveAndFinish: calling updateAll()")
      AccountsGlanceWidget().updateAll(this@AccountsWidgetConfigActivity)
      Log.d(TAG, "saveAndFinish: updateAll() returned")

      setResult(Activity.RESULT_OK, Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId))
      finish()
    }
  }

  companion object {
    private const val TAG = "WidgetBridge"
  }
}

@Composable
private fun ConfigScreen(
  accounts: List<WidgetAccountOption>,
  initialSelected: Set<Long>,
  initialOpacityPct: Int,
  onSave: (List<Long>, Int) -> Unit,
) {
  var selected by remember { mutableStateOf(initialSelected) }
  var opacityPct by remember { mutableStateOf(initialOpacityPct.toFloat()) }

  Column(
    modifier = Modifier
      .fillMaxSize()
      .background(ColorBg)
      .padding(top = 48.dp),
  ) {
    Text(
      text = "Choose accounts",
      color = ColorFg,
      fontSize = 20.sp,
      fontWeight = FontWeight.Bold,
      modifier = Modifier.padding(horizontal = 20.dp),
    )
    Spacer(modifier = Modifier.height(4.dp))
    Text(
      text = "Pick any number of accounts to show on this widget.",
      color = ColorFgMuted,
      fontSize = 13.sp,
      modifier = Modifier.padding(horizontal = 20.dp),
    )
    Spacer(modifier = Modifier.height(16.dp))

    LazyColumn(
      modifier = Modifier.weight(1f),
      contentPadding = PaddingValues(horizontal = 20.dp),
      verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
      items(accounts, key = { it.id }) { acct ->
        val isSelected = selected.contains(acct.id)
        Row(
          modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(ColorSurface)
            .clickable {
              selected = if (isSelected) selected - acct.id else selected + acct.id
            }
            .padding(vertical = 12.dp, horizontal = 14.dp),
          verticalAlignment = Alignment.CenterVertically,
          horizontalArrangement = Arrangement.SpaceBetween,
        ) {
          Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
            Box(
              modifier = Modifier
                .size(20.dp)
                .clip(RoundedCornerShape(6.dp))
                .background(if (isSelected) ColorAccent else Color.Transparent),
            )
            Spacer(modifier = Modifier.width(12.dp))
            Text(
              text = acct.name,
              color = ColorFg,
              fontSize = 15.sp,
              fontWeight = FontWeight.Medium,
              maxLines = 1,
              modifier = Modifier.weight(1f, fill = false),
            )
          }
          Text(text = formatMoney(acct.balanceMinor, acct.currency), color = ColorFgMuted, fontSize = 14.sp)
        }
      }
    }

    Column(modifier = Modifier.padding(horizontal = 20.dp, vertical = 16.dp)) {
      Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(text = "Widget transparency", color = ColorFg, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
        Text(text = "${opacityPct.toInt()}%", color = ColorFgMuted, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
      }
      Slider(
        value = opacityPct,
        onValueChange = { opacityPct = it },
        valueRange = 0f..100f,
        colors = SliderDefaults.colors(thumbColor = ColorAccent, activeTrackColor = ColorAccent),
      )
    }

    Box(modifier = Modifier.padding(20.dp)) {
      Row(
        modifier = Modifier
          .fillMaxWidth()
          .clip(RoundedCornerShape(14.dp))
          .background(AccentGradient)
          .clickable { onSave(selected.toList(), opacityPct.toInt()) }
          .padding(vertical = 14.dp),
        horizontalArrangement = Arrangement.Center,
      ) {
        Text(text = "Save", color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
      }
    }
  }
}
