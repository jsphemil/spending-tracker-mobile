# Home Screen Widgets — Step-by-Step Build Guide

Two separate Android home-screen widgets, selectable independently
when the user long-presses their home screen and picks a widget from
this app:

1. **Accounts & Quick Add** — selected accounts' current balances,
   plus Income/Expense/Transfer quick-add icon buttons.
2. **Portfolio Rings & Allocation** — the net worth gauge and asset
   allocation donut from the Dashboard, in miniature.

Android-only for now (matches the earlier decision to ship Android
first, iOS deferred — see spec.md §2). Everything below is additive:
new native module, new config screens, new background data-read path.
**Nothing here touches existing screens, calculations, or the data
model.**

---

## 0. The one hard technical constraint to understand first

A home screen widget is not a smaller version of your app's screens —
it renders through Android's `RemoteViews` (or Jetpack Glance), a
constrained native view system, not React Native. This means:

- No Erebor glass/blur/gradient backgrounds — solid fills only.
- No arbitrary custom fonts guaranteed to render — stick to system-safe
  fonts.
- **No live custom-drawn charts.** `GaugeRing`/`AssetAllocationDonut`
  are SVG components rendered by React Native — a widget can't embed
  them directly. Widget 2 (rings/allocation) has to render its chart
  as a **pre-rendered bitmap image** (drawn off-screen, saved as a
  PNG, displayed via an `ImageView`) that gets regenerated every time
  the underlying data changes. This is the standard way any app does
  a chart-like widget on Android — not a workaround specific to this
  project, but a real added step Widget 2 needs that Widget 1 doesn't.
- Widgets must ship **two explicit appearances** (light/dark) — not
  one CSS-variable-adaptive theme like the app has now. Android picks
  the right one automatically based on system theme.

## 1. Library and compatibility check (do this before anything else)

- Library: [`react-native-android-widget`](https://github.com/sAleksovski/react-native-android-widget)
  — lets you define widget layouts in JSX-like syntax that compiles to
  native `RemoteViews`, with an Expo config plugin for the native
  wiring (manifest entries, widget provider registration).
- **Not yet verified against this project's Expo SDK 57** — first
  real step is installing it in a throwaway branch and confirming
  `expo prebuild` succeeds and a minimal "hello world" widget shows up
  on the home screen, before building either real widget on top of it.
- If it's incompatible or unmaintained for SDK 57, the fallback is
  writing the `AppWidgetProvider`/Glance code directly in
  `android/app/src/main/...` via an Expo config plugin — more native
  Kotlin code, same end result, bigger lift.

## 2. Shared plumbing (both widgets need this)

- **Data bridge**: a background task (native or a headless JS task,
  depending on what the library supports) reads the SQLite database
  directly and computes whatever the widget needs, then calls the
  native widget-update API to refresh what's on the home screen. This
  runs independently of the main app being open.
  - Widget 1 needs: each selected account's current balance
    (`getAccountBalanceMinor`, already exists in `services/balance.ts`
    — just called from a new context, not new logic).
  - Widget 2 needs: net worth + capacity (same math `GaugeRing`
    already uses on the Dashboard) and the asset allocation buckets
    (same math the Dashboard's donut already uses).
- **Configuration screen**: shown when the widget is added to the home
  screen. This *is* a normal Expo Router screen (a real Activity, not
  RemoteViews-constrained) — reuse existing UI components directly.
  - Widget 1's config screen: a multi-select account picker ("any
    number of accounts").
  - Widget 2's config screen: likely no picker needed at all (it's
    whole-portfolio, not per-account) — confirm this against what you
    actually want shown before building it.
- **Deep links for quick-add** (Widget 1 only): each icon button opens
  `spendingtracker://transaction/new?type=income` (or `expense`/
  `transfer`) — **already fully supported**, `app/transaction/new.tsx`
  already reads `type`/`accountId` from route params, confirmed
  2026-08-28. No app-side changes needed for this part.
- **Update triggers**: widgets should refresh when their underlying
  data changes, not just on a timer. Practical approach: trigger a
  widget-refresh call from wherever transactions/accounts are
  created/edited/deleted (`db/actions/*.ts`), in addition to Android's
  own periodic update schedule (minimum 30 minutes, an OS-level
  constraint, not a design choice).

## 3. Claude Design briefs

Two separate briefs, one per widget — Claude Design doesn't know
`RemoteViews` constraints, so tell it explicitly. Ask for **light and
dark versions of each**, not one adaptive design.

**Widget 1 — Accounts & Quick Add:**
```
Design an Android home screen widget for Erebor Wealth Management.
Layout: a vertical list of account rows (account name + current
balance, one row per selected account, 1-4 accounts typical), and a
bottom row of 3 icon buttons (Income / Expense / Transfer — use
up-arrow, down-arrow, and swap-arrows glyphs respectively). Solid
fills only, no blur/glass/gradient backgrounds, system-safe fonts
only. Deliver TWO versions: one for light system theme (light
background, dark text), one for dark system theme (dark background,
light text) — matching the brand's [cyan/blue/violet accent] for the
icon buttons in both. Keep it compact — widgets are small, this needs
to read at a glance.
```

**Widget 2 — Portfolio Rings & Allocation:**
```
Design an Android home screen widget for Erebor Wealth Management
showing portfolio overview. Layout: a capacity ring/gauge (like a
speedometer arc) showing net worth with a center label, plus a small
donut chart below or beside it showing asset allocation
(Liquid/Deposits/Invested proportions). Solid fills only, no blur/
glass/gradient backgrounds. This will be rendered as a static image
that refreshes periodically, not a live interactive chart, so design
it as a single flat composition, not overlapping interactive layers.
Deliver TWO versions: light system theme and dark system theme.
```

## 4. Build order

1. Library compatibility spike (§1) — confirm before investing further.
2. Widget 1 end-to-end: config screen → data bridge → RemoteViews
   layout → quick-add deep links → light/dark variants → on-device test.
3. Widget 2 end-to-end: bitmap-rendering pipeline for the
   ring+donut → data bridge → RemoteViews layout (just an ImageView
   showing the generated bitmap) → light/dark variants → on-device test.
4. Native rebuild (`expo prebuild --clean` + `expo run:android`) —
   required, same as every other native addition so far.
5. Add both widgets to a home screen and verify: correct data on
   first add, correct data after adding a transaction in the app,
   correct appearance in both light and dark system theme, quick-add
   buttons open the right pre-filled form.

## 5. What this doesn't touch

No changes to `db/schema.ts`, existing screens, `services/balance.ts`'s
actual math, or any already-shipped feature. The only touch to
existing app code is calling a "refresh the widgets" function from
`db/actions/*.ts` after a write — everything else is new files.

## 6. Known risks to flag early, not discover late

- Library/SDK 57 compatibility (§1) — unverified, do this first.
- Widget 2's bitmap-rendering approach is meaningfully more work than
  Widget 1 — consider shipping Widget 1 first as its own milestone
  rather than building both simultaneously.
- Android's minimum widget-update interval is 30 minutes for scheduled
  updates — the "refresh on data change" trigger (§2) is what makes it
  feel instant in practice; without it, a balance change in the app
  could take up to 30 minutes to show on the home screen.
