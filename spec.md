# Spending Tracker Mobile — Draft Spec (v1)

> **This is a separate, new product** — forked from the spec for the
> original web app (which stays as-is, for personal use, hosted on
> Supabase). This spec drops the "must also work as a website" goal and
> is built mobile-only, local-first, from scratch, carrying over the
> feature decisions, business logic, and lessons learned from that
> project. Edit freely before we start building.

## Status Dashboard

_Kept current per CLAUDE.md's Idea Backlog Protocol — updated the
moment a status genuinely changes, not batched. Last updated: 2026-08-28._

**Legend:** ✅ Built & Verified (built *and* confirmed working on a
real device/build) · 🚧 In Progress (code exists, not yet verified, or
partially built) · 📋 Planned (not started) · ⏸️ Deferred (intentionally
pushed to a later phase) · ❌ Dropped (cut from scope).

| Section | Feature | Status | Notes |
|---|---|---|---|
| §5.1 | Accounts | ✅ Built & Verified | Phase 10 parity pass + UAT round 1 (2026-08-20, 3 bugs fixed: credit limit required for credit_card accounts, delete-account navigation, Breakdown icon rendering) + the 2-round recurring-rule FK delete fix (2026-08-20). Confirmed on-device via `backlog.md`'s UAT checklist §2: create-each-type, opening balance ≠0/=0, currency validation, header pencil→edit+delete, delete-blocked-with-transactions, Breakdown totals, Accounts-list month-nav+per-account figures all pass. **Two items never got a specific on-device check and are worth a final look**: Safe-to-spend/day, and the credit-card debt payoff projection line — both are code-complete, just unconfirmed live. |
| §5.2 | Transactions | ✅ Built & Verified | Recurring transactions (Phase 5, 13 tests) + Phase 10 (SummaryBand, Duplicate+Edit+Delete icons, inline "+ New category") + the 2026-08-21 Recurring/Transfers type filter. UAT checklist §3 confirms create-all-3-types, category-required, amount-positive+expression-eval, tag inline add/select, edit/delete icons, opening-balance-row lockout, inward-transfer-leg visibility, signed transfer display, This month/Custom range/All time filter, and SummaryBand — all pass. One item stays intentionally as-is: the Duplicate icon doesn't prefill account/category (user explicitly withdrew the fix request 2026-08-21, "leave it"). |
| §5.3 | Categories | ✅ Built & Verified | Full CRUD + starter seed + UAT round 3 fixes (no-budget category showing no total, Income tab totals hardcoded to ₹0). UAT checklist §4 confirms create/edit/delete and the spend-vs-budget bar — pass. |
| §5.3a | Tags | ✅ Built & Verified | Inline creation + per-tag summary + the 2026-08-20 Dashboard Tags card/`/tag` list screen addition. UAT checklist §5 confirms tag summary + transaction list — pass. |
| §5.4 | Spending Summary | ✅ Built & Verified | Month nav, net worth, Indian formatting, Carry Forward, asset allocation donut all confirmed via the Dashboard/Account UAT items. The "literal pie chart" from the original description was a deliberate substitution, not a gap — matches §5.12's own gauge/donut-over-pie design decision (Categories' spend-vs-budget bars + the asset allocation donut + Account Detail's Breakdown list cover composition/budget-comparison needs). |
| §5.5 | Budget Mode | ✅ Built & Verified | Account-level toggle + category-level budgets, both confirmed via UAT checklist §4 ("Account-level Budget Mode toggle... passed") and §13 (Profile global switches). |
| §5.6 | Show/Hide Future Transactions | ✅ Built & Verified | Toggle + schema built; filtering applied across all 4 screens (Account Detail, Dashboard, Transactions, Calendar). User confirmed on-device 2026-08-20: all 4 screens pass. |
| §5.7 | Smart Features (Claude) | ❌ Dropped | User confirmed 2026-08-20 this isn't getting built — inert FAB placeholder removed same day |
| §5.8 | Dashboard | ✅ Built & Verified | Full rebuild (net worth gauge, trend chart, asset allocation donut, over-budget banner, embedded calendar, Accounts/Goals/Recent Transactions/Tags cards) + UAT fixes (icon-as-text banner bug, Show-Future-Transactions wiring). UAT checklist §9 confirms the gauge, trend chart, donut, stat row, calendar, and cards all pass. The over-budget banner itself only got a partial re-check ("please push a category over budget and confirm the banner text is clean") — worth one more explicit look, though the underlying bug (icon-as-text) is fixed and visually reconfirmed since. |
| §5.9 | Navigation | ✅ Built & Verified | 6 tabs (Dashboard, Accounts, Transactions, Commitments, Categories, Profile) with icons — UAT checklist §14 confirms, and every screenshot from the 2026-08-28 design-refresh session shows tab icons rendering correctly (now Lucide icons, see §5.18). |
| §5.10 | Profile Page | ✅ Built & Verified | Display name, Budget Mode/Show Future Transactions global switches, Base Currency all confirmed via UAT checklist §13. Dropbox section (connect/backup/restore) shipped and was verified on-device 2026-08-28 — see §3. The Light/Dark/System theme toggle described in the original spec text was **removed 2026-08-28** as part of §5.18's dark-only redesign — see that section. |
| §5.11 | Home Screen Widget | 🚧 In Progress | **Scope expanded 2026-08-28** — two separate selectable widgets: (1) Accounts & Quick Add (any number of selected accounts' balances + Income/Expense/Transfer quick-add icons), (2) Portfolio Rings & Allocation (net worth gauge + asset allocation donut, mirroring the Dashboard). Android-only for now, matching the iOS-deferred decision. **Library compatibility spike passed 2026-08-28** (`widget-spike` branch) — `react-native-android-widget` v0.22.1 confirmed working against this project's Expo SDK 57/RN 0.86.2: `expo prebuild` generates a correct native widget provider, and a minimal test widget rendered correctly on the user's home screen. Discovered the library's `SvgWidget` accepts a raw SVG string directly, simplifying Widget 2's plan (generate an SVG string from the existing ring/donut math, no bitmap-screenshot pipeline needed). Full build plan in `homescreen-widget-guide.md`. Not yet built: both real widgets, still just the spike scaffold. |
| §5.12 | Visual Design System (superseded) | ✅ Built & Verified | The dark-first token theme / monospace-tabular / gauge-over-pie system described here shipped and was verified (Phases 1-3, UAT checklist §15). **Superseded 2026-08-28 by §5.18** — the token *values*, glass-card ask from UAT §15 ("a glass effect would be nice"), and the whole visual language were replaced wholesale by the Erebor redesign. Kept here for history; §5.18 is now the authoritative visual-design status. |
| §5.13 | First-Run Onboarding & Base Currency | ✅ Built & Verified | Onboarding flow + gate, live per-install base currency (not hardcoded INR), searchable ~170-currency picker. UAT checklist §1 confirms every step, the currency-picker search, and base-currency-change recalculation across the whole app — all pass (including the 2026-08-21 SafeAreaView fix for the onboarding-flush-to-top bug). |
| §5.14 | CSV Export | ✅ Built & Verified | Matches the web app's account/date-filtered CSV export; required a native rebuild for `expo-file-system`/`expo-sharing` — verified on-device 2026-08-12, and re-confirmed working after all the base-currency changes (UAT checklist §12). |
| §5.15 | In-App Info/Tips | ⏸️ Deferred | Explicitly deferred by the user to a later pass — not started. |
| §5.16 | Commitments | ✅ Built & Verified | New tab, monthly-normalized recurring rules, % of recurring income committed. UAT checklist §7 confirms the sections and monthly-equivalent math (verified correct, not a bug — average-month normalization). Complex recurrence patterns (nth-weekday-of-month etc.) were requested then **withdrawn by the user 2026-08-21** ("it can be ignored") — not building. The "% of recurring income" line was explained to the user but never independently re-confirmed against their own live data — low-stakes, worth a glance next time it's relevant. |
| §5.17 | Goals | ✅ Built & Verified | Goal CRUD, trailing-6-month pace projection, behind-pace flag, Dashboard card. UAT checklist §8 confirms creation, progress bar, projection text, and behind-pace warning — all pass. |
| §5.18 | Design Refresh — "Erebor" | ✅ Built & Verified | **New, 2026-08-28.** Complete visual redesign sourced from a separate Claude Design project the user built ("Erebor Wealth App Design System," dark glassy-neon fintech language), applied as a presentational-only pass on the `design-refresh` branch and merged to `master` the same day. See the full write-up below (§5.18) for what shipped, what was explicitly decided, and the one behavior change (AccountForm's icon became user-selectable, at the user's explicit request). Verified via multiple rounds of on-device testing on the user's Pixel 10, including native rebuilds for the new `expo-linear-gradient`/`expo-font` dependencies. |
| §3 | Dropbox Backup/Restore | ✅ Built & Verified | **Built and fully verified on-device 2026-08-28.** PKCE OAuth connect flow (`services/dropbox.ts`, `expo-auth-session`+`expo-web-browser`, App-folder-scoped access), tokens in `expo-secure-store` (never the unencrypted `settings` table), `VACUUM INTO`-based consistent snapshot backup (not a raw file copy or JSON export), check-on-app-open "automatic daily" backup (a true OS background task is unreliable on mobile — see the feature's own write-up below), manual backup, and a restore picker (`app/backup/restore.tsx`) that replaces the local DB file and prompts a manual app restart. Connect, manual backup, and restore-then-restart all confirmed working on the user's phone. |

**Remaining known gaps** (everything else above is fully verified):
Safe-to-spend/day and the debt-payoff-projection line (§5.1) never got
an explicit on-device check; the over-budget banner (§5.8) only got a
partial re-check; offline currency-conversion fallback (mentioned under
§5.13) couldn't be tested in the user's current environment (no way to
go offline to test it). None of these are known-broken — they're
code-complete and either passed indirectly or simply weren't
individually re-confirmed. See `backlog.md`'s UAT checklist for the
exact unchecked items.

## 1. What this app is

A personal finance app for tracking money across multiple accounts
(bank accounts, credit cards, cash, savings, investments) — the same
core idea as the original web app, rebuilt as a standalone, sellable,
**mobile-only** product for the App Store / Play Store.

## 2. Platform

- **Mobile only** — iOS and Android, distributed through the App Store
  and Play Store. No web/browser version of this product (that's what
  the original web app already covers, kept separately for personal use).
- **Launch sequencing decided 2026-08-28: Android first, iOS deferred.**
  All current publishing work (developer account, closed testing, store
  assets) targets Play Store only. No iOS-specific work has started —
  no Apple Developer account, no App Store Connect, no iOS build ever
  tested. iOS is a follow-up phase once Android ships, not dropped from
  v1 scope entirely, just not simultaneous.
- **Recommended tech stack: Expo (React Native) + TypeScript.**
  Reasoning: same language as the web app, so existing TypeScript
  knowledge carries over directly; purpose-built for native mobile
  (unlike the original Next.js stack, which assumes a server — a
  mismatch now that there's no server-hosted data model); excellent
  local SQLite support via `expo-sqlite`; EAS (Expo's build service)
  handles App Store/Play Store builds and submission without needing
  to touch Xcode/Android Studio directly for most of the work.
- **Architecture: local-first, not developer-hosted.** Each device
  stores its own copy of the data (SQLite via `expo-sqlite`) as the
  real source of truth. There is **no shared cloud database that the
  developer hosts or has access to** — this is a deliberate choice so
  that, as the app is sold as a one-time purchase, the developer never
  becomes responsible for hosting or securing other people's financial
  data, and hosting costs don't scale with the number of people who
  buy the app.

## 3. Where data lives

- **Local-first:** all data lives on the device itself, in the app's
  local SQLite database. The app works fully offline — nothing requires
  an internet connection to log a transaction, view balances, etc.
- **Cross-device continuity via the user's own cloud storage, not a
  developer-hosted database.** This mirrors how the previous app (the
  one this project is inspired by) already works with Dropbox:
  - **Automatic daily backup** to a cloud storage folder that belongs to
    the *user* (starting with Dropbox, since that's what people are
    already used to from the old app; other providers like Google Drive
    or iCloud could be added later)
  - **Manual "back up now"** option, always available
  - **Restoring on a new device:** connect the same cloud account, and
    a picker shows every available backup — auto and manual ones
    clearly labeled separately — so the user chooses which one to
    restore, exactly like the current app's flow
  - This is **backup-and-restore, not real-time sync** — editing the
    app on one device won't instantly appear on another. Restoring a
    backup on a second device is how continuity across devices works.
    This is an intentional trade-off: it avoids the developer needing
    to host any live sync service, at the cost of not being
    instantaneous across devices
- **The developer never has access to, or hosts, any user's financial
  data** — cloud backups go directly from the user's device to the
  user's own Dropbox (or similar) account
- **Possible future option (not v1):** an advanced/optional mode where a
  technically comfortable user connects their *own* free database
  project (e.g. their own Supabase project) for closer-to-real-time
  sync across their devices — still not hosted or paid for by the
  developer, since it would be the user's own project
**Dropbox backup implementation, built and fully verified on-device
2026-08-28** (✅ Built & Verified in the Status Dashboard):
- **OAuth: PKCE flow via `expo-auth-session`/`expo-web-browser`**, App-
  folder-scoped access (Dropbox's least-privilege option — the app can
  only see its own sandboxed folder in the user's Dropbox, never the
  rest of it), requesting `token_access_type: offline` to get a refresh
  token so daily automatic backups never need the user to re-auth.
- **Tokens live in `expo-secure-store`, never in this app's own SQLite
  `settings` table** (which isn't encrypted) — only non-sensitive
  metadata (the connected account's email, doubling as the "connected"
  signal; the last automatic-backup date) is a `settings` column.
- **Backup format: a consistent snapshot via SQLite's own `VACUUM
  INTO`**, not a raw file copy (which could miss data still sitting in
  a `-wal` journal file) and not a JSON export — restoring is just
  swapping the live database file for the downloaded one.
- **"Automatic daily backup" is a check-on-app-open, not a true OS
  background task.** Real background execution on mobile is
  opportunistic (the OS decides if/when it actually runs, with no
  reliable daily guarantee, especially on iOS) — decided 2026-08-28
  that for an app the user opens regularly anyway, silently backing up
  once per day on foreground is the honest, reliable version of
  "automatic," not worth a new background-task dependency for a
  guarantee mobile OSes don't actually provide.
- **Restore replaces the local database file, then prompts a manual
  app restart** — deliberately not attempting to hot-swap the live
  `expo-sqlite` connection in place, and not pulling in `expo-updates`
  just for an automatic reload. Safer, at the cost of one manual
  restart step for the user.
- **No backup retention/pruning in v1** — backups accumulate in the
  user's own Dropbox indefinitely; explicitly scoped out as their own
  storage to manage, not silently forgotten.
- Filenames distinguish auto vs. manual for the restore picker per the
  design above: `backup-auto-YYYY-MM-DD.db` /
  `backup-manual-YYYY-MM-DDTHHmmss.db`.
- **Dropbox App Console app created, App Key provisioned into
  `app.json`'s `extra.dropboxAppKey`, native rebuild done** — the real
  Dropbox login → OAuth consent → connect flow is confirmed working on
  the user's phone as of 2026-08-28. Two bugs found and fixed during
  that first on-device pass: (1) the OAuth redirect
  (`spendingtracker://dropbox-auth`) was separately caught by
  expo-router's own deep-link matching and briefly showed an
  "Unmatched Route" screen — fixed with a no-op `app/dropbox-auth.tsx`
  bounce screen that just routes back to Profile; (2) the post-connect
  account-info request was sending a JSON `Content-Type` header with no
  body, which Dropbox's API rejects with a 400 — fixed by dropping that
  header on the no-argument `users/get_current_account` call. Manual
  backup upload and a restore-then-restart were both confirmed working
  on-device immediately after. The Dropbox app itself starts capped at
  50 linked accounts
  until Dropbox approves it for Production — worth starting that
  approval in parallel with other publishing prep, same lead-time
  lesson as §9's Play Store closed testing.
- Files: `services/dropbox.ts` (OAuth/API/backup/restore),
  `services/dropboxBackupNaming.ts` (pure filename generation/parsing,
  split out so it's unit-testable without pulling in native-only
  imports — 8 tests), `components/DropboxBackupCard.tsx` (Profile's
  card, replacing the old static placeholder), `app/backup/restore.tsx`
  (the restore picker, registered as a modal in `app/_layout.tsx`), a
  new `settings.dropboxAccountEmail`/`settings.lastAutoBackupDate`
  migration (`drizzle/0006_overconfident_shriek.sql`).

## 4. Logging in

**Decided: no login at all.** With local-first storage (section 3), there's
no shared server to authenticate against, so the app just works on the
device — open it and your data is there, no account, no email, no
password. Identity is simply tied to the device itself.

- A PIN/passcode lock (already planned as a later feature, section 6)
  can still protect the app locally without needing any account system
- Dropbox connection (for backup) has its own separate login/OAuth step
  when the user chooses to set it up — that's Dropbox's login, not the
  app's, and stays completely independent of this decision

## 5. Core features for Version 1

Everything below is the "must-have" list. Anything not listed here
(see section 6) is intentionally left out of v1 and can be added later.

### 5.1 Accounts ✅ Built & Verified
- Create, edit, delete accounts (e.g. "Cash", "HDFC Salary", "Credit Card")
- Each account has: a name, a type, a color or icon, and a running balance
- Supported account types: Savings, Investment, Deposit (FD/RD-style),
  Wallet/Cash, Credit Card — this list is final for v1
- **Credit Card accounts:** balance is naturally negative (expenses are
  logged first, the bill payment is the "income" that brings it back
  toward zero). Credit Card accounts require a **Credit Limit** field
  (corrected 2026-08-20 — previously documented as optional, but a credit
  card account with no limit makes the usage ring/available-credit figures
  meaningless; `AccountForm` now rejects saving a credit_card account with
  the field left blank, not just an explicitly-entered 0/negative value),
  which enables:
  - showing "available credit" (limit − amount owed)
  - a **visual usage bar** — fills up as expenses reduce the available
    credit, so utilization is visible at a glance rather than just as a
    number
  - this can later power a warning as you approach the limit
  - **Credit Card accounts use an entirely different ring, not the
    regular income-vs-expense one** — the fill shows % of the credit
    limit used (not % of income spent), and the center figure is the
    net amount currently owed (expenses minus any bill payments already
    made), not the period's raw expense total. Going over the credit
    limit triggers the same second warning lap as overspending does
    elsewhere
- When creating an account, you enter an **opening balance** as of the
  creation date — this becomes the starting point the account builds from
- Accounts can be in a **currency other than the user's base currency**
  (e.g. a Dirham cash account for someone whose base is INR — or, for a
  customer outside India, any other pairing entirely; see §5.13, base
  currency is picked at first launch, not hardcoded). The app converts the
  balance to the base currency using a live/real-time exchange rate for
  any total that mixes currencies
  - **Recommended source: the Frankfurter API** (`api.frankfurter.dev`) —
    free, open-source, no API key or signup required, no usage limits.
    Use the newer v2 endpoint specifically (sources from 84 central
    banks, 201 currencies, includes AED) rather than the older v1/ECB-only
    version, which only covers ~30 major currencies and would miss AED
- View a list of all accounts with their current balances
- **Tapping into an account** opens that account's own detail page, using
  the same balance-ring summary view as the Dashboard, scoped to just
  that account's income and expenses for the period (plus its own
  transaction list and the credit-limit line, if applicable)
- Every account view has 3 clear buttons: **Income**, **Expense**, **Transfer**
- **UAT round 1 fixes, 2026-08-20**: deleting an account now lands on the
  Accounts list directly (`router.dismissTo`) instead of leaving a stale
  screen for the just-deleted account; the Breakdown section's category
  rows now render the category's icon as an actual icon glyph instead of
  its internal name slug as literal text (e.g. "cash Salary" → 🪙 Salary) —
  see backlog.md for full detail.

### 5.2 Transactions ✅ Built & Verified

**Every transaction captures:** amount, date, category, account, and an
optional description.

**Three types of transactions:**
- **Income** — money coming in
- **Expense** — money going out
- **Transfer** — money moving between two of your own accounts
  - Has a "from account" and a "to account"
  - Shows up in the "from" account's ledger as an outgoing amount (negative)
  - Shows up in the "to" account's ledger as an incoming amount (positive)
  - Example: transferring ₹100 from Account A to Account B shows as
    −₹100 in A and +₹100 in B

**Recurring transactions:**
- Any transaction (income, expense, or transfer) can be set to repeat on a
  custom schedule
- **The "make recurring" option is visible right on the transaction entry
  screen itself** — a toggle alongside amount, category, account, date,
  etc. — not a separate setup step. It's available for all three types:
  Income, Expense, and Transfer entries
- **Schedule format:** "repeat every [N] [day / week / month / year]" —
  a number plus a unit dropdown, so it covers everything from "every 3
  days" to "every 2 years" without needing separate preset options
- **Optional end date:** a recurring transaction can be given an end date
  (when it should stop repeating). This is optional — left blank, it
  repeats indefinitely until manually stopped or deleted
- Recurring transactions automatically appear in the ledger for every
  period they occur in, not just the day they were created

**Editing & deleting:**
- Editing or deleting any transaction — normal, transfer, or recurring —
  must correctly update every place it appears (the account balance, the
  ledger/transaction list, and the monthly summary)
- **Editing a recurring transaction always asks**: "just this one" or
  "this and all future occurrences" — every time, not a fixed default

**Viewing transactions:**
- View all transactions in a list, newest first
- Filter transactions by account, category, date range, or type (All
  Types / Recurring / Transfers — added 2026-08-21)
- **Summary band:** a two-color bar pinned above the list — green showing
  total income, red/pink showing total expenses — for whatever is
  currently being viewed (all accounts or one account, for the selected
  month). Updates instantly as the filter changes
- **Calendar view:** a calendar where you can add a transaction on a
  specific day, and each day shows that day's total expenses at a glance

### 5.3 Categories ✅ Built & Verified
- Separate lists for Expense categories and Income categories
- Create, edit, delete categories
- Each category has a name, an icon, **and a color** (chosen when the
  category is created — used for icons, chart segments, etc.)
- A starter set of common categories will be created automatically for
  new users (e.g. Shopping, Eating Out, Travel, Rent, Salary), which they
  can change

### 5.3a Tags ✅ Built & Verified
- A **separate, optional label** that can be added to any transaction
  (income, expense, or transfer) at entry time — alongside account,
  category, date, etc. A transaction keeps its normal account and
  category; the tag is additional, not a replacement for either
- **Purpose:** grouping transactions that span multiple accounts and
  multiple categories around a single occasion — the clearest example is
  a trip. A hotel booked on a credit card, a meal paid from one bank
  account, a cab paid from another, and money received back from friends
  splitting costs can all carry the same tag (e.g. "Dubai Trip 2026"),
  even though each transaction has its own separate account and category
- **Tags apply to income too** — money received (e.g. a friend paying
  back their share) can carry the same tag as the expenses it's offsetting
- **A tag has its own summary view**, same shape as an account or
  category summary: total tagged income, total tagged expense, and the
  net figure (e.g. "Net cost of trip: ₹8,850.00") — plus the full list of
  transactions carrying that tag, regardless of which account or
  category each one actually belongs to
- Tags are free-form (create a new one anytime while adding a
  transaction) and reusable beyond trips — the same mechanism works for
  things like "Wedding costs" or "Office reimbursements" without needing
  a separate feature for each
- **Why tags instead of a category-per-trip:** categories describe *what
  kind* of spending something is (Food, Travel, Shopping); a trip is an
  *occasion*, not a kind of spending. Using categories for trips would
  either lose the real category on each transaction or clutter the
  category list (and skew the category pie chart) with a new entry per
  trip. Tags keep these as two separate, independent dimensions
- **Browsing tags, added 2026-08-20**: a tag's own summary page
  (`/tag/[name]`) was previously only reachable by tapping a tag chip on
  a transaction that already had it — no way to see or reach a tag you
  weren't currently looking at. Per the user's request: the Dashboard
  gets a **Tags card** showing the most recently-used tags (up to 8, most
  recent first, deduped) as tappable chips, each opening straight into
  that tag's summary; a **"More" link** opens a new standalone **Tags
  list screen** (`/tag`, alphabetical, every tag that exists) for
  anything not recent enough to show on the Dashboard card.

### 5.4 Spending Summary ✅ Built & Verified
- Pick a month (or "all accounts" vs. a single account) and see:
  - Total income for the period
  - Total expenses for the period, broken down by category (largest first)
  - **Carry Forward** — the balance rolled in from the end of the previous
    period, shown as its own labeled line (not silently merged into income)
  - Ending balance for the period
- Switch between months using next/previous controls
- **Monthly pie chart:** one pie chart for income by category and one for
  expenses by category, for the selected month
- The **"All Accounts" total** always displays in INR, converting any
  foreign-currency accounts using the current exchange rate
- The **"All Accounts" total is a true net worth figure** — credit card
  balances (which are negative) are included and pull the total down,
  the same way a real net worth calculation would. Credit card debt is
  also broken out and shown as its own separate line, so it's visible
  at a glance rather than just buried in the total
- **Income/Expense shown as numbers, not just the ring:** every balance-ring
  view (Dashboard's all-accounts view, and each individual account's page)
  also shows the period's total Income and total Expense as plain figures
  alongside it — the ring gives the at-a-glance read, the numbers give
  the precise one
- **Foreign currency accounts** show both figures wherever an amount
  appears (balance, income, expense) — the native currency amount and
  its INR equivalent, e.g. "AED 500.00 · ≈ ₹11,310.00"
- **Number format:** Indian numbering system throughout (e.g. ₹1,53,168.00,
  not ₹153,168.00)

### 5.5 Budget Mode ✅ Built & Verified
- A toggle in **Settings**, available both **globally** (whole app) and
  **per account**
- **Budget limits can be set at both the account level and the category
  level** — the earlier "per account, not per category" claim here was
  wrong (confirmed against the real web app's Prisma schema, which has
  budget fields on both `Account` and `Category`; corrected 2026-08-12).
  When Budget Mode is turned on for an account, it asks for that
  account's **monthly budget amount**
- Once set, the app can compare actual spending on that account against
  its budget (e.g. in the account's own ring/summary view)
- **Category-level budgets** (independent of the account-level toggle
  above): any **expense** category can optionally have a monthly budget,
  entered in the app's base currency (INR) since a category spans
  transactions across accounts/currencies. Always compares against the
  **current calendar month only** — no month navigation, matching the
  real app's categories page. Shown as a spend-vs-budget bar on each
  category's row in the Categories list, red when spending exceeds the
  budget. Built 2026-08-12, on-device verification pending.

### 5.6 Show/Hide Future Transactions ✅ Built & Verified
- A toggle that controls whether transactions dated in the future show
  up in lists/summaries
- Can be set **globally** or **per account**, same pattern as Budget Mode

### 5.7 Smart Features (powered by Claude) ❌ Dropped
- **Add transactions by typing plain English**, e.g. "spent 200 on lunch
  today from HDFC card" — the app reads this, figures out the amount,
  category, account, and date, shows you what it understood, and only
  adds it to the ledger after you confirm it's correct
- **Ask questions about your spending** in plain English, e.g. "how much
  did I spend on eating out last month?" or "which account has the
  highest expenses this year?" — the app answers using your real
  transaction data
- **Entry point (removed):** was going to be a floating round icon,
  always visible in the bottom corner of the screen (the familiar "chat
  bubble" pattern used by website chat widgets), opening a chat-style
  panel for either logging a transaction or asking a question.
- **Dropped 2026-08-20**: the user confirmed during UAT this isn't
  getting built ("it can actually be removed, i am not going to build
  this feature") — the inert placeholder FAB (`app/(tabs)/_layout.tsx`)
  was removed the same day, along with the bottom-left/right FAB-
  collision-avoidance logic it existed for.

### 5.8 Dashboard (Landing Page) ✅ Built & Verified
- The first screen you land on; a persistent month-nav pill at the top
  scopes every figure below to the viewed month (not just "always today")
- **Rebuilt 2026-08-12 to match the real app exactly**, superseding the
  original simpler description below:
  - Over-budget banner (only shown when any expense category is over its
    monthly budget this month) — one line per category with a link to
    Categories to review
  - **Net worth** card: a capacity gauge (`GaugeRing`), not an income-
    vs-expense ratio — ring capacity is Carry Forward + Income, Used is
    Expense, center shows the month + net worth figure + "X% of
    available used"; "Overdrawn by X" below if negative
  - **Net worth trend** card: a line chart over up to 12 months, capped
    to the account's actual transaction history (a new profile shows
    just the 1 real point it has, not 11 months of misleading padding)
  - 4-up stat row: Carry forward / Income / Expense / Credit card debt
  - **Asset allocation** card: a donut over Liquid/Deposits/Invested
    balances (credit card debt excluded, shown as its own line instead)
  - **Goals** card: top 3 goals with progress bars, "View all"/"Set a
    goal" link to the full Goals list (§5.17)
  - Embedded **calendar** (the month grid, with +Income/+Expense/
    +Transfer quick-add buttons above it — same component the dedicated
    Calendar screen uses)
  - **Accounts** card: every account listed with its balance, "View all"
    link to the Accounts tab
  - **Recent transactions** card: the 5 most recent transactions (across
    all accounts, up to the viewed month's end), with inline Edit/Delete
    icon buttons per row instead of tap-to-edit — Delete on a recurring
    row prompts "just this one" vs "this and all future"
  - **Tags** card, added 2026-08-20 (see §5.3a): up to 8 most-recently-used
    tags as tappable chips, "More" link to the full Tags list (`/tag`)
- Acts as the "home base" you can always return to

### 5.9 Navigation ✅ Built & Verified
- A persistent bottom tab bar to move between the main sections —
  **6 tabs**: Dashboard, Accounts, Transactions, Commitments (§5.16),
  Categories, Profile, each with its own icon (added 2026-08-20 — UAT
  found the tabs had never had `tabBarIcon` set, showing a broken/missing-
  icon placeholder instead)
- ~~The floating Claude assistant icon (section 5.7) stays visible and
  accessible no matter which page you're on~~ — removed 2026-08-20, §5.7
  dropped
- Goals (§5.17) is deliberately not a tab, matching the real app — it's
  reached via the Dashboard's Goals card

### 5.10 Profile Page ✅ Built & Verified
- No account/login (see section 4), so no email, password, or sign-out —
  this page becomes local app preferences instead: a local display name
  (optional, cosmetic only), Dropbox connection status/management,
  currency/date-format preferences

### 5.12 Visual Design System (superseded by §5.18) ✅ Built & Verified

**Decided 2026-08-11: full port of the source web app's design language**,
per `knowledge-transfer.md` §4 — supersedes the earlier "dark mode /
theme customization is out of scope for v1" call in §6 below, which is
now stale and kept only for history.

- **Token-based semantic theming, never a hardcoded color in a
  component.** A small named palette (`bg`, `surface`/`surface-2`/
  `surface-3`, `border`/`border-strong`, `fg`/`fg-muted`/`fg-subtle`,
  `accent`/`accent-soft`/`accent-strong`, `success`/`success-soft`,
  `danger`/`danger-soft`, and a third neutral-but-distinct `transfer`
  color) defined for both a dark and a light theme with equal care —
  components consume token names only, never a raw hex value. On this
  stack (NativeWind/Tailwind v3 + React Native), the mechanism is a
  theme object through context/provider (or NativeWind's dark: variant
  driven by that same context), not CSS custom properties.
- **Fintech-terminal numeric styling:** every money figure in a
  monospace/tabular-numeral font, using the Indian locale grouping
  already in place (`₹1,53,168.00`).
- **Gauges over flow-ratio pies for capacity questions** (already
  matches — `BalanceRing`/`CreditUsageRing` use this pattern); ratio
  pies or plain lists-with-subtotals for composition questions
  (relevant once Phase 2's category breakdown / monthly pie charts are
  built — reconsider list vs. pie per the source project's own
  lesson before defaulting to a pie).
- **One repeated card primitive** for every discrete content block,
  reused everywhere rather than bespoke per-screen containers.
- **Compact icon actions** (not repeated text links) for per-row
  actions, with a truncating content column and a non-shrinking action
  column.
- **FAB placement is planned, not defaulted** — audit every screen for
  existing bottom-right occupants (month-nav arrows) before adding
  another one there; measure actual stacking gaps rather than
  eyeballing them. (The Claude assistant placeholder FAB this
  originally had to dodge is gone — §5.7 dropped 2026-08-20.)
- **Explicit loading/empty/error states** for every list and async
  boundary — no bare blank areas, no silent freezes.
- Full reference palette (dark theme values) and the rest of the
  detail live in `knowledge-transfer.md` §4 and Appendix B — treat the
  hex values there as a starting point, not a mandate; light-theme
  values need their own tuning pass, not a mechanical inversion.
- **Status correction, 2026-08-19**: this section had been left marked
  📋 Planned since it was first written, but the actual work landed
  across Phases 1-3 (`theme/palette.ts`, `tailwind.config.js`,
  `global.css` — independently tuned light AND dark values, not a
  mechanical inversion) and was never updated to say so — the dashboard
  had drifted. Corrected to 🚧 In Progress, matching everything else
  pending a full on-device pass. Confirmed built: token-based theming
  (Phase 13's codebase-wide hardcoded-hex grep found only legitimate
  exceptions — palette source, color-picker swatches — plus 2 real bugs,
  both fixed, see backlog.md), monospace tabular money figures, gauge
  rings for capacity questions, one shared card primitive, compact icon
  row-actions, explicit loading/empty/error states everywhere. FAB
  placement was audited (`app/(tabs)/_layout.tsx`'s comment documents the
  bottom-left/bottom-right split to avoid the Claude-placeholder FAB
  colliding with each tab's own "+" FAB). One real gap found during this
  correction and fixed same day: all 5 month-nav arrow pairs (Dashboard,
  Accounts list, Account Detail, Transactions list, Calendar) were plain
  Unicode "‹"/"›" text glyphs — legible but visually thin regardless of
  font size, which is why enlarging their tap target earlier didn't
  address the user's "still look small" feedback. Replaced with
  `MaterialCommunityIcons` `chevron-left`/`chevron-right` at 28px,
  consistent with every other icon in the app.

### 5.11 Mobile Home Screen Widget 🚧 In Progress

**Scope expanded 2026-08-28 to two separate, independently-selectable
widgets** (superseding the single-widget description originally
below, kept struck-through for history) — full build plan lives in
`homescreen-widget-guide.md`, not duplicated here:

1. **Accounts & Quick Add** — any number of selected accounts' current
   balances, plus Income/Expense/Transfer quick-add icon buttons that
   deep-link into the existing transaction form pre-filled.
2. **Portfolio Rings & Allocation** — a miniature version of the
   Dashboard's net worth gauge + asset allocation donut, rendered as a
   refreshing bitmap image (Android widgets can't embed the app's live
   SVG chart components directly).

Both must adapt to the device's system light/dark theme (shipped as
two explicit widget appearances, not one CSS-adaptive theme) and are
**Android-only for now**, matching the iOS-deferred decision (§2).
Not started — first step is verifying `react-native-android-widget`'s
compatibility with this project's Expo SDK 57.

~~Since this app is native mobile from day one (not a wrapped web app),
the home-screen widget is core v1, not a later phase~~
- ~~Setting up the widget: when adding the widget to the home screen,
  you're asked to pick which account it should track (so you can pin
  your most-used account, e.g. your daily spending account)~~
- ~~Shows: the selected account's name and current balance~~
- ~~Two quick-action buttons right on the widget: + Expense and
  + Income, so a transaction can be logged in a couple of taps from
  the phone's home screen~~
- ~~Changing the account at entry time: tapping + Expense or + Income
  opens the transaction entry screen pre-filled with the widget's
  account, but that account can still be changed there before the
  transaction is confirmed — the widget's account is a default, not a lock~~

### 5.13 First-Run Onboarding & Base Currency ✅ Built & Verified
- **Decided 2026-08-12.** The real web app hardcodes `INR` as the base
  currency everywhere (`BASE_CURRENCY = "INR"` in its Dashboard,
  Transactions, Categories, and `CurrencyAmount` — it's a single-market,
  India-first product). This mobile app is being built for **global
  customers**, so that assumption doesn't carry over: base currency
  becomes a real per-install user setting (`settings.baseCurrency`),
  not a fixed constant.
- **First-run onboarding**, shown once before the main tabs are reachable
  at all:
  1. Pick a default/base currency
  2. Enter a name
  3. Add at least one account (can't finish onboarding with zero accounts)
  4. A lightweight one-time "here's what this app does" screen introducing
     the key features
- Every place that currently assumes/hardcodes INR needs to read
  `settings.baseCurrency` instead once this ships: `services/currency.ts`
  (`getRatesToINR` generalizes to a base-currency parameter, not a fixed
  target), the Dashboard's net worth/income/expense aggregation, the
  Transactions summary band's "All Accounts" conversion, the Categories
  budget spend calculation, and `CurrencyAmount`'s "≈ {base}" equivalent
  line. Profile's existing Base Currency field becomes real instead of
  inert.
- **Base currency is a live setting, not a one-time onboarding choice**
  (clarified 2026-08-12): the user must be able to change it anytime from
  Profile, same field used at onboarding. Every conversion in the app
  always calibrates to whichever base currency is *current*, not
  whichever was picked at first launch — e.g. pick USD at onboarding, add
  an AED account (converts against USD); later switch base currency to
  EUR in Profile, and that same AED account's conversion immediately
  re-references EUR, no stale USD figures left anywhere. Concretely:
  `getRatesToINR` → `getRatesToBase(db, currencies, baseCurrency)`, with
  the Frankfurter query's `base=` param and the `exchangeRateCache` read
  (`eq(exchangeRateCache.targetCurrency, baseCurrency)`) both driven by
  the live setting — the cache schema already keys rows by an arbitrary
  `targetCurrency`, so switching base currency naturally starts a fresh
  set of cache rows rather than needing an explicit cache-clear step.
- **Not the same as §5.15** (In-App Info/Tips) — the first-run feature
  intro is a short, one-time thing shown at install; the Info/Tips page is
  a fuller, always-available reference living in Profile, built later.
- **Currency picker is a full searchable dropdown, not a handful of pills**
  (requested 2026-08-13, after seeing Profile's field only offered ~6
  quick picks): new `services/currency.ts`'s `getSupportedCurrencies()`
  fetches Frankfurter's `/v2/currencies` (all ~170 supported currencies,
  code+name+symbol), cached in-memory for the app session; new
  `components/CurrencyPicker.tsx` — a modal with a search box over that
  list — used for base-currency selection (onboarding step 1 + Profile).
  Account-level currency (`AccountForm`) keeps its existing pill+free-text
  field for now, unaffected.
- Code-complete 2026-08-13: `settings.onboardingCompleted` column
  (migration 0005, backfilled to `true` for any row that already has
  accounts so existing installs with real data never see onboarding),
  `components/OnboardingFlow.tsx` (4 steps: currency → name → first
  account via `AccountForm` inline → feature intro), gated in
  `app/_layout.tsx` by rendering it in place of the normal `<Stack>`
  rather than as a routed screen. `services/currency.ts`'s
  `getRatesToINR`/`getExchangeRate` generalized to
  `getRatesToBase(db, currencies, baseCurrency)` — `getExchangeRate` got
  simpler in the process (a direct single-hop Frankfurter call using
  `target` as the pivot, instead of the old always-through-INR two-hop),
  9 tests including a non-INR-base case. Swept every hardcoded
  `BASE_CURRENCY = "INR"` module constant (8 files: Dashboard,
  Transactions, Categories, Commitments, Calendar, Goals, Tag summary,
  `CurrencyAmount`) to read `settings.baseCurrency` live via `useSettings()`
  instead. On-device verification pending — this is the largest
  cross-cutting change since the useLiveQuery fix, worth checking
  broadly (onboarding flow itself, plus every foreign-currency figure
  after changing base currency in Profile).
- **Sequencing decided 2026-08-12: Phase 12**, after Phases 5-10
  (Recurring, Commitments, Goals, net worth series, Dashboard rebuild,
  Accounts/Transactions parity) and before the final audit — the
  currency-conversion code already built in Phases 3-4 today will get
  touched a second time when this lands, a deliberate tradeoff to keep
  momentum on the page-by-page parity work first.

### 5.14 CSV Export ✅ Built & Verified
- **Decided 2026-08-12, Phase 11.** Matches the web app's Profile-page
  export: pick zero or more accounts (unchecked = every account), a
  From/To date range, then export. Columns: Date, Type, Account,
  Category, Description, Amount, Currency, Tags, Recurring (Yes/No).
- Web app implementation is a server route generating a CSV response;
  mobile has no server, so this needs `expo-file-system` (write the CSV
  string to a file) + `expo-sharing` (hand it to the OS share sheet) —
  the CSV's actual row/column shape stays identical, only the delivery
  mechanism differs.
- Code-complete 2026-08-12: `services/csv.ts` (`toCsv`/`csvField`, ported
  verbatim from the real app's RFC-4180 escaping + UTF-8 BOM),
  `services/export.ts`'s `buildTransactionsCsv` (account + inclusive
  date-range filter, matching either leg of a transfer, tag names joined
  with "; ", Opening Balance/Uncategorized category fallback — 5 tests),
  `components/ExportTransactionsForm.tsx` on the Profile page (account
  toggle pills, From/To pickers defaulting to Jan 1 this year → today,
  writes via the new `expo-file-system` `File`/`Paths` API, hands off to
  `expo-sharing`). One deliberate divergence from the web app: a
  transfer's Currency column uses the source account's own currency
  instead of a hardcoded "INR" — the web app is INR-only, mobile already
  supports per-account currencies. Required a native rebuild
  (`expo run:android`) since `expo-file-system`/`expo-sharing` are new
  native modules, not just JS. Verified on-device 2026-08-12: exported,
  opened the CSV, and confirmed a transfer row, an opening-balance row,
  and a tagged transaction all matched the expected column values.

### 5.15 In-App Info/Tips ⏸️ Deferred
- **Decided 2026-08-12, explicitly deferred by the user** ("later we
  will build") — a reference page in Profile explaining the app's
  features in more depth than the one-time onboarding intro (§5.13) does.
  No phase assigned yet.

### 5.16 Commitments ✅ Built & Verified
- **New, discovered during the 2026-08-12 repo comparison** — not in the
  original spec, since the earlier knowledge-transfer summary this app
  started from missed it entirely.
- A dedicated **Commitments** tab (6th tab, between Transactions and
  Categories) showing every active recurring rule, normalized to a single
  "per month" figure regardless of its actual cadence (a yearly charge and
  a weekly one both roll into one monthly number) via `monthlyEquivalent`
  (services/recurrence.ts, built in Phase 5).
- **Total committed** card: sum of every recurring expense + transfer's
  monthly-equivalent, plus "X% of your recurring income" when there's any
  recurring income to compare against.
- Three sections (only shown if non-empty): **Recurring expenses**,
  **Recurring transfers & investments**, **Recurring income (for
  reference)** — each row shows the monthly-equivalent amount plus the
  rule's real amount/cadence/note underneath (e.g. "₹6,737.00 · Repeats
  every month · TRIUMPH SPEED 400").
- Built 2026-08-12: `app/(tabs)/commitments.tsx`,
  `db/queries/recurringRules.ts`. On-device verification pending.

### 5.17 Goals ✅ Built & Verified
- **New, discovered during the 2026-08-12 repo comparison** — not in the
  original spec, same as Commitments.
- A net-worth target (name, target amount in the base currency, optional
  target date) tracked against the whole portfolio, not any one account.
- **Progress bar** = current net worth ÷ target, clamped 0-100%, turns
  green and shows "🎉 Goal reached" once hit.
- **Pace projection**: `services/balance.ts`'s new `getNetWorthSeries`
  computes net worth today and 6 months ago; the trailing monthly growth
  rate projects a date the goal will be hit at the current pace ("At
  current pace, projected around April 2030"), or "Not currently trending
  toward this goal" if net worth isn't growing. If a target date is set
  and the projection lands after it, a "Behind pace for your target date"
  warning shows.
- **Not a tab** — matches the real app, which reaches Goals via a card on
  the Dashboard, not the bottom nav. Reached for now via a temporary
  "Goals →" link on the current Dashboard; Phase 9's Dashboard rebuild
  replaces it with the real top-3-goals card (progress bars, same
  treatment as the full list).
- Built 2026-08-12: `getNetWorthSeries` (unit-tested, `__tests__/balance.test.ts`),
  `db/actions/goals.ts`, `db/queries/goals.ts`, `components/GoalForm.tsx`,
  `app/goal/index.tsx` + `new.tsx` + `[id]/edit.tsx`. On-device verification
  pending.
- **Fixed 2026-08-19**: `goal/new` and `goal/[id]/edit` were never registered
  as screens in `app/_layout.tsx`'s root Stack — every other entity's
  new/edit screens (account, transaction, category) get
  `presentation: "modal", headerShown: true`, but Goals' were missing
  entirely, so they fell back to the Stack's default `headerShown: false`
  with no modal treatment. Reported by the user as "the 'goals' heading is
  too close to the top border — should be a pop-up like adding a
  transaction." Added the same two `Stack.Screen` entries used for the
  other three entities. On-device verification pending.

### 5.18 Design Refresh — "Erebor" ✅ Built & Verified

- **New, 2026-08-28.** The user built a separate Claude Design project
  ("Erebor Wealth App Design System," a dark glassy-neon fintech visual
  language — frosted-glass panels, neon gradient accents, Manrope
  display / Inter body typography, pill shapes, colored glow shadows)
  and asked for it applied to this app as a **presentational-only
  pass**: styling, theme tokens, and markup structure change; state
  management, calculations, API calls, navigation logic, and data
  persistence do not.
- Done on a `design-refresh` branch, merged into `master` the same day
  after full on-device verification on the user's Pixel 10.
- **Scope decisions confirmed with the user before implementation:**
  - **Dark-only.** Erebor has no light theme in its source. The
    Light/Dark/System toggle was removed from Profile (§5.10);
    `settings.themePreference`'s schema/storage/`updateSettings` logic
    is untouched, just no longer exposed in the UI — `theme/palette.ts`'s
    `useResolvedTheme()` now always resolves `"dark"`.
  - **Glass = translucent solid fills, no real blur.** React Native has
    no `backdrop-filter` equivalent; `expo-blur` was deliberately not
    added (avoids a new native dependency and Android blur performance
    cost) — frosted panels are approximated with semi-transparent fills
    + hairline borders + drop shadows instead.
  - **Full icon-library swap**, `@expo/vector-icons`'
    MaterialCommunityIcons → `lucide-react-native`, via a lookup layer
    (`theme/icons.ts`) so every already-persisted category/account icon
    slug keeps resolving without a data migration.
- **The one place this touched more than pure styling, done at the
  user's explicit request mid-implementation:** categories *and*
  accounts now get full icon freedom via a new searchable ~70-icon
  picker (`constants/iconLibrary.ts`, `components/ui/IconPicker.tsx`),
  replacing the old fixed 19-option category grid. Accounts previously
  had **no icon choice at all** — the icon was silently auto-derived
  from account type (`ACCOUNT_TYPE_ICONS[type]`) on every save.
  `AccountForm` now defaults to the type's icon but lets the user
  override it, and the Accounts list renders the chosen icon (previously
  just a bare color circle).
- **What shipped:** theme/palette rewrite to Erebor's token values,
  gradient + glow-shadow helpers, Manrope/Inter font loading, the full
  icon swap above, a glass-surface sweep across ~22 files (solid
  card/pill/input backgrounds → translucent glass tokens), a pill-shaped
  `ui/Button` (gradient-filled primary via `expo-linear-gradient`,
  tinted-glass success/danger/transfer, transparent-to-glass ghost) wired
  into every form that previously hand-rolled its own submit button, a
  glass `ui/Card`, a floating glass-pill bottom tab bar (with a
  `theme/tabBar.ts` constant so every screen's scroll content and FAB
  correctly clear it — this needed its own follow-up fix after the first
  on-device test found labels clipping and screen content hidden
  underneath the floating bar), a focus-glow `ui/Input` used everywhere
  a `TextInput` existed, and two-tier typography (money → Inter via the
  `font-data` Tailwind key, headline figures/section titles → Manrope
  via `font-display`/`font-display-xbold`).
- **Explicitly not built:** no new in-app Toast/Dialog component system
  — the app's only transient/confirmation UI is native `Alert.alert` in
  4 places, which can't be restyled from React Native and had nothing
  existing to "re-skin," so introducing one would have been new
  interaction plumbing, not a presentational pass.
- **Native-rebuild detour:** `expo-linear-gradient` and `expo-font` are
  real native modules, not JS-only — installing them required a full
  `expo prebuild --clean` + `expo run:android` (not just a Metro
  reload) to get them properly linked into the dev-client build on the
  user's phone, plus resolving a stray-Metro-process port collision
  along the way. See [[project_android_native_build_env]] memory for
  the exact failure signatures if this recurs.

## 6. Explicitly out of scope for v1

(Move these up if you want them sooner — just say so.)

- ~~Dark mode / theme customization~~ — **moved in-scope 2026-08-11,
  see §5.12.** Struck rather than deleted so the history of the
  decision stays visible.
- Passcode/biometric lock
- Reminders/notifications
- Reports/charts beyond the monthly summary and pie charts

**Note:** Dropbox backup/restore is core v1 infrastructure here, not an
add-on — see section 3.

## 7. Open questions / things to decide

- [x] ~~Monetization: how should the Claude-powered features (§5.7) be
      sold~~ — **moot, 2026-08-28.** §5.7 was dropped entirely
      2026-08-20; there's no Claude feature left to price or host a
      proxy for. One-time purchase for the core app is still the
      confirmed direction (see §9 Monetization).
- [ ] **Which cloud backup providers beyond Dropbox, if any, and in what
      order?** (Google Drive, iCloud)
- [x] **App Store / Play Store submission specifics** — Play Store side
      tracked in detail in §9 (Play Store Launch Readiness). iOS/App
      Store equivalent **deliberately deferred 2026-08-28** — Android
      ships first, iOS is a follow-up phase (see §2 Platform); not
      scoped out further until that phase starts.
- [ ] (Add your own notes here)

---

## 8. Build Progress

_Last updated: 2026-08-13. Maintained per CLAUDE.md's Idea Backlog
Protocol. **The Status Dashboard at the top of this file is the
authoritative, currently-accurate per-feature status** — check that
first. This section is a short narrative history; day-to-day
what-shipped-when detail lives in `backlog.md`'s Triaged/Done sections,
not duplicated here._

**History, briefly:** the app was first built as a simpler v1 (core
offline ledger — accounts, transactions, categories, tags, a basic
dashboard). Comparing against the real web app repo
(github.com/jsphemil/claude-spending-tracker — see
[[project-repo-source-of-truth]]) then showed the gap to full
logic+design parity was much bigger than originally scoped, so the plan
was redone as 13 phases (see `C:\Users\jsphe\.claude\plans\idempotent-kindling-quilt.md`
for the full phase-by-phase plan). Phases 1-12 are code-complete;
several have cleared on-device verification (marked ✅ in the Status
Dashboard). **Phase 13 (this final audit) is in progress as of
2026-08-13.**

### Tech stack in use

Expo SDK 57, TypeScript, Expo Router, NativeWind (Tailwind v3 line —
pinned below NativeWind's Tailwind v4 support), Drizzle ORM 0.45 +
expo-sqlite (`PRAGMA foreign_keys = ON` explicitly enabled — SQLite
defaults it off, which would otherwise silently no-op every
`onDelete: restrict/cascade/set null` rule in the schema), Zustand not
yet needed (no cross-screen UI state has required it so far), Jest +
ts-jest + better-sqlite3 for the service-layer test suite. All
monetary amounts are stored as integers in the currency's smallest
unit (paise/fils/cents), not floats, to avoid rounding drift.

**Notable environment finding:** Expo Go on the Play/App Store is
capped at SDK 54 and no longer tracks new SDKs at all (per Expo's own
May 2026 changelog) — this project is on SDK 57, so it requires an EAS
development build (or a local `expo run:android`/`expo run:ios` build)
rather than plain Expo Go. This also means the app can no longer be
previewed in a browser: real `expo-sqlite` storage needs
`SharedArrayBuffer` on web, which requires cross-origin-isolation
headers the dev server doesn't send — consistent with the spec's
mobile-only scope, but worth knowing if browser preview is ever
attempted again.

### Next priorities

**Phase 13 (final feature audit) is done as of 2026-08-28** —
spec.md/backlog.md sync sweep complete, every UAT checklist section
worked through and the Status Dashboard now reflects ✅ Built &
Verified for every v1 feature except §5.15 (In-App Info/Tips,
intentionally deferred) and §5.11 (Home Screen Widget, scope expanded
to two widgets and 📋 Planned — see `homescreen-widget-guide.md`, not
started yet), plus a small named list of never-independently-confirmed
edges (see the Status Dashboard's "Remaining known gaps" note). §3 Dropbox Backup joined the
✅ list 2026-08-28 once connect, backup, and restore were all confirmed
on-device. The
"full on-device pass in both themes" item is moot — §5.18's redesign
made the app dark-only, there's no second theme to compare against
anymore.

**The design refresh (§5.18) also shipped and merged to `master`
2026-08-28**, on top of the feature-complete app.

With features and visual design both done, what's left before this is
genuinely ready to ship is almost entirely **§9 (Play Store Launch
Readiness)** — not app code:

1. ~~Add a README.md~~ — done.
2. Work through §9 top to bottom: ~~store listing assets (icon,
   screenshots, feature graphic)~~ — done 2026-08-28, ~~a hosted
   privacy policy~~ — done. Still open: the Data Safety form, a Google
   Play Developer account, Content Rating/Target Audience, and — the
   single longest lead-time item — the mandatory 12-tester/14-day
   closed testing track, which can start as soon as a stable build
   exists rather than waiting for every last checklist box.
3. Monetization (one-time purchase, confirmed direction) still needs
   an actual implementation decision and `expo-iap`/RevenueCat
   integration — currently just a §7 open question, not started.

## 9. Play Store Launch Readiness

_Last updated: 2026-08-12. Tracked separately from the Status Dashboard
above since these are Play Console/submission requirements, not app
features — reviewed against Google's Play Store requirements
2026-08-12. Re-check the "Privacy & data" items every time a feature
that talks to the network or a third party lands (Dropbox backup,
Claude smart features, analytics, IAP)._

### Technical / build
- [x] Production build outputs a signed `.aab`, not `.apk` —
      `eas.json`'s `production` profile has no `buildType` override
      (only `development`/`preview` force `apk`, correctly, for
      internal test installs).
- [x] Play App Signing — default behavior for EAS-managed builds,
      nothing in the repo opts out of it.
- [x] Minimal, justified permissions — no `expo-location`/
      `expo-camera`/`expo-notifications`/`expo-media-library` in
      `package.json`, no explicit `android.permissions` block in
      `app.json`.
- [ ] Confirm the actual EAS build targets API 36 (Android 16) and,
      if any native `.so` libs end up in the build, that they're
      16KB-page-aligned — not independently verifiable from source;
      check the EAS build output once a production build is run.

### Legal
- [x] **License decided 2026-08-28: All Rights Reserved / proprietary**
      (`LICENSE`), copyright held by Melior Developments by EJE —
      replaces the leftover Expo-template MIT license, correctly
      reflecting this as a closed-source commercial product.

### Store listing
- [x] **App icon — done 2026-08-28.** Designed in Claude Design (dark
      glassy-neon mountain-peak glyph on the brand gradient, per
      `store-assets-guide.md`), exported text-free after an initial
      version with a wordmark was rejected for illegibility at small
      sizes. Play Store listing icon at `assets/store/icon-512.png`
      (512×512, RGBA PNG). Also regenerated the in-app icon set from
      it: `assets/icon.png` (1024×1024, iOS/general), Android adaptive
      icon layers (`assets/android-icon-foreground.png`,
      `-background.png` — the brand gradient recreated at full bleed,
      `-monochrome.png` — a white silhouette for Android 13+ themed
      icons), and `assets/favicon.png`. The glyph was rescaled/
      recentered programmatically to fit Android's adaptive-icon safe
      zone (verified via a circle-mask composite preview — no
      clipping). `app.json`'s `adaptiveIcon.backgroundColor` updated
      to `#4c7dff` to match. Native rebuild done same day — new icon
      confirmed live on the user's device.
- [x] **Feature graphic — done 2026-08-28.** `assets/store/feature-graphic.png`
      (1024×500, RGB, no alpha). First draft used an unrelated orange
      dot-pyramid mark that didn't match the real app icon — caught in
      review, regenerated in Claude Design using the actual icon file
      as reference; now uses the same chevron glyph and brand
      gradient as `assets/icon.png`.
- [x] **Screenshots — done 2026-08-28.** 7 phone screenshots at
      `assets/store/screenshots/` (1080×2340, RGB, no alpha), covering
      Dashboard (net worth, asset allocation, accounts card),
      Accounts, Transactions, Categories, and Profile — each a real
      screenshot in a device frame with a marketing caption, per
      `store-assets-guide.md`. Two review rounds caught real defects
      before these shipped: (1) the first batch had a systemic
      double-exposure/ghosting artifact on every image (unrelated
      content bleeding through near the tab bar) — regenerated; (1a)
      that same first batch leaked the user's **real personal Dropbox
      email** in the Profile screenshot's ghosted layer — fixed by
      both removing the ghosting and anonymizing the shown email to
      `you@example.com`; (2) two of the regenerated screenshots
      (allocation legend, account list) had text wrapping and
      overlapping the line below it — fixed with a targeted spacing
      prompt, verified clean on the third pass.
- [x] Title (≤30 chars) / short description (≤80 chars) / full
      description (≤4,000 chars) — **drafted 2026-08-28**, see
      `store-listing.md`. Product name decided 2026-08-28: **Erebor
      Wealth Management** — `app.json`'s `name` updated to match;
      `slug`/`scheme`/Android package/iOS bundle identifier stay as
      the original technical project name (internal identifiers, not
      user-facing).
- [ ] Content Rating questionnaire — not started (Play Console step,
      no code dependency).
- [ ] Target Audience declaration — not started (Play Console step,
      no code dependency).

### Privacy & data
- [x] **Privacy policy hosted at a public URL — live 2026-08-28:**
      https://meliordevelopments.github.io/erebor-wealth-management-pp/
      Hosted via GitHub Pages from a dedicated public repo
      (`meliordevelopments/erebor-wealth-management-pp`), not a raw
      `github.com/.../blob/main/*.md` link, per the 2026-08-12
      decision — keeps the main app repo private. Content
      (`privacy-policy.md`) covers the Frankfurter currency API and
      the Dropbox backup section (App-folder-scoped access, on-device
      secure token storage, never seeing backup content), and lists
      meliordevelopments@gmail.com as the contact email.
- [ ] **Data Safety form.** Was narrow (Frankfurter currency API only,
      no personal data) — **now that Dropbox backup (§3) is
      code-complete, this form needs to account for it before
      submission**: declare the OAuth data collected (Dropbox account
      email), that backup files are user-controlled data in transit to
      a third party (Dropbox) the user explicitly connects, and that
      none of it is retained by this app's developer. Not yet filled
      out in Play Console (no code dependency, but blocked on the
      Developer account existing first).

### Monetization
- [x] **Resolved 2026-08-28: simple paid app, no in-app purchases.**
      Now that §5.7 (Smart Features, the only feature that ever needed
      a separate unlock) is dropped, there's nothing left to sell
      beyond the core app itself. This means: **no `expo-iap`/
      RevenueCat integration and no Restore Purchases flow needed** —
      a one-time purchase price is set directly in Play Console's
      Pricing & Distribution page for the app listing, a pure Play
      Console config step with zero code dependency. Whether Play
      Console still requires some form of payments-profile/Merchant
      KYC just to set a price on a paid listing (separate from IAP) is
      a Play Console policy question, not confirmable from this repo
      — see the Payments Merchant item below.

### Accounts & process
- [ ] Google Play Developer account ($25, individual, government-ID
      verification, few days to a week) — **in progress 2026-08-28**,
      user has started sign-up; step-by-step in `closed-testing-guide.md`.
- [ ] **Google Payments Merchant account — not needed yet, revisited
      2026-08-28.** The user had started this (Play Console prompted
      for it while poking at payments setup) and hit BillDesk's KYC
      form asking for a live Website URL / Mobile App APK URL that
      didn't exist yet — paused pending a monetization decision. Now
      that monetization is resolved (simple one-time-purchase paid
      listing, no IAP/subscriptions — see Monetization above), the
      `expo-iap`/RevenueCat-specific reason for this account is gone.
      **Not independently verified whether Play Console still requires
      a payments profile just to set a price on a paid app listing at
      all** (separate from IAP) — that's a Play Console policy
      question, not something confirmable from this repo. Revisit when
      actually setting the app's price in Play Console; if prompted
      there, this is that same flow, now with a real Play Store
      listing to reference in the KYC form.
- [ ] **Closed testing (12 opted-in testers, 14 continuous days).**
      Mandatory for personal developer accounts created after Nov
      2023, and the single longest lead-time item in the whole
      process. **Started 2026-08-28** — see `closed-testing-guide.md`
      for the full walkthrough. First production AAB built 2026-08-28
      via `eas build --platform android --profile production`
      (versionCode 2), ready to upload the moment a Play Console app
      exists: https://expo.dev/artifacts/eas/a-XWPkXk4p5iYVT7JamaajK7gMVl1vP_vBU9ALhJEO0.aab
      (build logs: https://expo.dev/accounts/jsphemil/projects/spending-tracker-mobile/builds/a58ff3f9-d2fc-4227-957e-53e50266008e).

---
*Once this file reflects what you want, the next step is setting up a
new Claude Code project for this app — separate from the existing web
app's project — and starting the build.*
