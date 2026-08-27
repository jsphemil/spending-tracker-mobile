# Spending Tracker Mobile — Draft Spec (v1)

> **This is a separate, new product** — forked from the spec for the
> original web app (which stays as-is, for personal use, hosted on
> Supabase). This spec drops the "must also work as a website" goal and
> is built mobile-only, local-first, from scratch, carrying over the
> feature decisions, business logic, and lessons learned from that
> project. Edit freely before we start building.

## Status Dashboard

_Kept current per CLAUDE.md's Idea Backlog Protocol — updated the
moment a status genuinely changes, not batched. Last updated: 2026-08-20._

**Legend:** ✅ Built & Verified (built *and* confirmed working on a
real device/build) · 🚧 In Progress (code exists, not yet verified, or
partially built) · 📋 Planned (not started) · ⏸️ Deferred (intentionally
pushed to a later phase) · ❌ Dropped (cut from scope).

| Section | Feature | Status | Notes |
|---|---|---|---|
| §5.1 | Accounts | 🚧 In Progress | Full Phase 10 parity pass 2026-08-12: Account Detail page rebuilt (correct capacity-gauge ring, Carry Forward/Total In/Total Out/Left to Spend, Safe-to-spend/day, debt payoff projection, Budget Mode bar wired up, category/counterpart Breakdown section, Show-Future-Transactions hidden-count notice, Duplicate+Edit+Delete icons); Accounts list gained month nav + per-account Income/Expense/Transfers row + period-scoped balance. UAT round 1 (2026-08-20): 3 bugs found and fixed (credit limit now required for credit_card accounts, delete-account navigation, Breakdown icon rendering). Also fixed 2026-08-20: `deleteAccount` didn't guard against recurring rules referencing the account (only real transactions), so deleting one with an active or past recurring rule against it threw a raw FK error instead of a friendly message — on-device re-verification pending |
| §5.2 | Transactions | 🚧 In Progress | Entry/edit/list/filters/calendar built; recurring transactions (Phase 5) code-complete 2026-08-12 — engine (`services/recurrence.ts`) unit-tested (13 tests), "make recurring" toggle, just-this-one/this-and-future edit+delete scope picker, 🔁 badge, `ensureMaterialized` wired into Dashboard/Transactions/Accounts/Categories/Calendar. Phase 10 (2026-08-12): "Clear (show all time)" toggle, SummaryBand proportional bar, Duplicate+Edit+Delete icons, Duplicate-transaction flow, inline "+ New category" on the transaction form — on-device verification pending |
| §5.3 | Categories | 🚧 In Progress | Full CRUD + starter seed built. UAT round 3 (2026-08-20): 2 bugs fixed — a category with no budget set showed no monthly total at all, and the Income tab's totals were always ₹0 (the sum was hardcoded to expense-type transactions only, regardless of the active tab) — on-device re-verification pending |
| §5.3a | Tags | 🚧 In Progress | Inline creation + per-tag summary (with currency conversion) built. Added 2026-08-20 per UAT feedback: Dashboard "Tags" card (recent tags) + a new `/tag` list screen ("More" link), since a tag's summary page was previously only reachable via a chip on a transaction already showing it — on-device verification pending |
| §5.4 | Spending Summary | 🚧 In Progress | Month nav, net worth, Indian formatting, Carry Forward (Dashboard + Account Detail), asset allocation donut all built; a literal income/expense-by-category pie chart specifically hasn't been built (Categories list's spend-vs-budget bars cover the budget-comparison need, but not a pie visualization) — on-device verification pending |
| §5.5 | Budget Mode | 🚧 In Progress | Account-level toggle + schema built, spend-vs-budget comparison now wired up (Phase 10, `resolveAccountSettings` actually called from Account Detail's Budget Mode bar); category-level budgets (separate from the toggle) built 2026-08-12 with spend-vs-budget bars on the Categories list — on-device verification pending for both |
| §5.6 | Show/Hide Future Transactions | 🚧 In Progress | Toggle + schema built; filtering now applied (Phase 10, Account Detail hides future-dated rows when the resolved setting is off) — on-device verification pending |
| §5.7 | Smart Features (Claude) | ⏸️ Deferred | Phase 4. Inert FAB placeholder only |
| §5.8 | Dashboard | 🚧 In Progress | Fully rebuilt 2026-08-12 to match the real app: net worth capacity gauge, net worth trend chart (history-capped), asset allocation donut, over-budget banner, embedded calendar with quick-add buttons, Accounts card, Goals card (top 3), Recent Transactions card with inline edit/delete icons. Tags card added 2026-08-20 (see §5.3a) — on-device verification pending |
| §5.9 | Navigation | 🚧 In Progress | Built; Commitments tab added 2026-08-12 (Dashboard, Accounts, Transactions, Commitments, Categories, Profile — 6 tabs total, matching the real app's order) |
| §5.10 | Profile Page | 🚧 In Progress | Built; Dropbox section is an inert placeholder |
| §5.11 | Home Screen Widget | ⏸️ Deferred | Phase 5 |
| §5.12 | Visual Design System | 🚧 In Progress | Full port of the web app's dark-first token theme, monospace tabular numerals, gauge-over-pie pattern, and card/FAB/empty-state conventions — decided 2026-08-11, supersedes the earlier "out of scope" call in §6. Status corrected 2026-08-19 (was stuck on 📋 Planned despite being built across Phases 1-3); month-nav arrows switched from thin text glyphs to proper icons same day — on-device verification pending |
| §5.13 | First-Run Onboarding & Base Currency | 🚧 In Progress | New — decided 2026-08-12. Unlike the web app (INR-only, single market), mobile ships for global customers: base currency becomes a real, live-editable user setting, not hardcoded INR. Phase 12 code-complete 2026-08-13: onboarding flow + gate, base currency generalized across every screen, full searchable currency dropdown (Frankfurter's ~170 currencies) replacing the old 6-pill picker — on-device verification pending |
| §5.14 | CSV Export | ✅ Built & Verified | New — decided 2026-08-12, matches the web app's account/date-filtered CSV export. Phase 11 code-complete 2026-08-12 (`services/csv.ts`, `services/export.ts`, `ExportTransactionsForm` on Profile), required a native rebuild for `expo-file-system`/`expo-sharing` — verified on-device 2026-08-12 |
| §5.15 | In-App Info/Tips | ⏸️ Deferred | New — decided 2026-08-12, explicitly deferred by the user to a later pass |
| §5.16 | Commitments | 🚧 In Progress | New — discovered during repo comparison (not in the original spec), Phase 6. Code-complete 2026-08-12: new "Commitments" tab, monthly-normalized recurring rules split into expense/transfer/income sections, % of recurring income committed. UAT round 4 (2026-08-20): fixed the same icon-slug-as-text bug the Breakdown section had; confirmed the monthly-equivalent math is correct (average-month normalization, not a bug); a request for complex recurrence patterns (nth-weekday-of-month etc.) logged as a deferred future feature, not started — on-device re-verification pending |
| §5.17 | Goals | 🚧 In Progress | New — discovered during repo comparison, Phases 7-8. Code-complete 2026-08-12: `services/balance.ts`'s `getNetWorthSeries` (Phase 8, unit-tested), goal CRUD + trailing-6-month pace projection + behind-pace flag (Phase 7). Reached via a temporary "Goals →" link on the Dashboard (not a tab, matching the real app) — Phase 9's Dashboard rebuild replaces it with the real top-3-goals card. On-device verification pending |
| §3 | Dropbox Backup/Restore | ⏸️ Deferred | Phase 3 |

§5.14 CSV Export is the only section marked ✅ so far — everything else
above is code-complete and type-checked but hasn't individually cleared
a full on-device verification pass yet (spot-checks of specific bug
fixes have gone well, per backlog.md's Triaged/Done sections, but that's
not the same as a systematic per-feature pass). Clearing the rest of
these is Phase 13's job (spec §8).

## 1. What this app is

A personal finance app for tracking money across multiple accounts
(bank accounts, credit cards, cash, savings, investments) — the same
core idea as the original web app, rebuilt as a standalone, sellable,
**mobile-only** product for the App Store / Play Store.

## 2. Platform

- **Mobile only** — iOS and Android, distributed through the App Store
  and Play Store. No web/browser version of this product (that's what
  the original web app already covers, kept separately for personal use).
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
- **Note on the Claude-powered smart features (section 5.7):** these
  need a small server-side piece to safely hold the Claude API key
  (never embed a real API key in app code). This is a stateless request
  relay, not a database — it never stores or has persistent access to
  any user's financial data, and is a separate concern from the "who
  hosts user data" question above

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

### 5.1 Accounts 🚧 In Progress
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

### 5.2 Transactions 🚧 In Progress

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
- Filter transactions by account, category, or date range
- **Summary band:** a two-color bar pinned above the list — green showing
  total income, red/pink showing total expenses — for whatever is
  currently being viewed (all accounts or one account, for the selected
  month). Updates instantly as the filter changes
- **Calendar view:** a calendar where you can add a transaction on a
  specific day, and each day shows that day's total expenses at a glance

### 5.3 Categories 🚧 In Progress
- Separate lists for Expense categories and Income categories
- Create, edit, delete categories
- Each category has a name, an icon, **and a color** (chosen when the
  category is created — used for icons, chart segments, etc.)
- A starter set of common categories will be created automatically for
  new users (e.g. Shopping, Eating Out, Travel, Rent, Salary), which they
  can change

### 5.3a Tags 🚧 In Progress
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

### 5.4 Spending Summary 🚧 In Progress
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

### 5.5 Budget Mode 🚧 In Progress
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

### 5.6 Show/Hide Future Transactions 🚧 In Progress
- A toggle that controls whether transactions dated in the future show
  up in lists/summaries
- Can be set **globally** or **per account**, same pattern as Budget Mode

### 5.7 Smart Features (powered by Claude) ⏸️ Deferred
- **Add transactions by typing plain English**, e.g. "spent 200 on lunch
  today from HDFC card" — the app reads this, figures out the amount,
  category, account, and date, shows you what it understood, and only
  adds it to the ledger after you confirm it's correct
- **Ask questions about your spending** in plain English, e.g. "how much
  did I spend on eating out last month?" or "which account has the
  highest expenses this year?" — the app answers using your real
  transaction data
- **Entry point:** a floating round icon, always visible in the bottom
  corner of the screen (the familiar "chat bubble" pattern used by
  website chat widgets). Tapping it opens a chat-style panel where you
  can either type a transaction to log or ask a question — both go
  through the same window

### 5.8 Dashboard (Landing Page) 🚧 In Progress
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

### 5.9 Navigation 🚧 In Progress
- A persistent bottom tab bar to move between the main sections —
  **6 tabs**: Dashboard, Accounts, Transactions, Commitments (§5.16),
  Categories, Profile
- The floating Claude assistant icon (section 5.7) stays visible and
  accessible no matter which page you're on
- Goals (§5.17) is deliberately not a tab, matching the real app — it's
  reached via the Dashboard's Goals card

### 5.10 Profile Page 🚧 In Progress
- No account/login (see section 4), so no email, password, or sign-out —
  this page becomes local app preferences instead: a local display name
  (optional, cosmetic only), Dropbox connection status/management,
  currency/date-format preferences

### 5.12 Visual Design System 🚧 In Progress

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
  existing bottom-right occupants (month-nav arrows, the Claude
  assistant placeholder FAB) before adding another one there; measure
  actual stacking gaps rather than eyeballing them.
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

### 5.11 Mobile Home Screen Widget ⏸️ Deferred
- Since this app is native mobile from day one (not a wrapped web app),
  the home-screen widget is **core v1**, not a later phase
- **Setting up the widget:** when adding the widget to the home screen,
  you're asked to pick which account it should track (so you can pin
  your most-used account, e.g. your daily spending account)
- Shows: the selected account's name and current balance
- Two quick-action buttons right on the widget: **+ Expense** and
  **+ Income**, so a transaction can be logged in a couple of taps from
  the phone's home screen
- **Changing the account at entry time:** tapping + Expense or + Income
  opens the transaction entry screen pre-filled with the widget's
  account, but that account can still be changed there before the
  transaction is confirmed — the widget's account is a default, not a lock

### 5.13 First-Run Onboarding & Base Currency 🚧 In Progress
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

### 5.16 Commitments 🚧 In Progress
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

### 5.17 Goals 🚧 In Progress
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

- [ ] **Monetization:** one-time purchase for the core app confirmed;
      how exactly should the Claude-powered features (section 5.7) be
      sold — separate one-time unlock, or a subscription? Still undecided.
- [ ] **Where does the small Claude API proxy (section 3) get hosted?**
      Needs to be cheap/free at low volume — a serverless function
      (Vercel, Cloudflare Workers) is the likely fit, but not yet chosen.
- [ ] **Which cloud backup providers beyond Dropbox, if any, and in what
      order?** (Google Drive, iCloud)
- [ ] **App Store / Play Store submission specifics** — Play Store side
      now tracked in detail in §9 (Play Store Launch Readiness); iOS/App
      Store equivalent still not scoped out.
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

1. **Finish Phase 13 (this final audit)**: spec.md/backlog.md sync
   sweep (in progress), hardcoded-color grep (done 2026-08-13 — found
   and fixed 2 real gaps: `placeholderTextColor` hardcoded to the
   light-mode value in 3 files, `CreditUsageRing`'s overflow-arc color
   not passed through to the theme's danger color), full on-device pass
   across every screen in both themes.
2. Clear the remaining "on-device verification pending" items in the
   Status Dashboard — most Phase 4-10 features are code-complete but
   not yet individually confirmed working live.
3. Once Phase 13 is done and the user considers the app genuinely
   complete: add a README.md (per backlog.md's Triaged section), then
   revisit spec.md §9's Play Store Launch Readiness checklist for real.

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

### Store listing
- [ ] App icon (512×512), feature graphic (1024×500), 2-8
      screenshots — none exist yet. `assets/` currently only has the
      in-app-bundle icon set (adaptive icon layers, splash, favicon),
      not dedicated store-listing assets.
- [ ] Title (≤30 chars) / short description (≤80 chars) / full
      description (≤4,000 chars) — not drafted.
- [ ] Content Rating questionnaire — not started (Play Console step,
      no code dependency).
- [ ] Target Audience declaration — not started (Play Console step,
      no code dependency).

### Privacy & data
- [ ] **Privacy policy hosted at a public URL.** Required — this is a
      finance app storing transaction/account/balance data, and
      becomes mandatory the moment Dropbox backup (§3) ships. Decided
      2026-08-12: host via GitHub Pages, not a raw
      `github.com/.../blob/main/*.md` link (which needs the repo to
      stay public forever and renders inside GitHub's code viewer
      rather than as a page) — likely a small dedicated public repo
      just for the policy page, keeping the main app repo private.
- [ ] **Data Safety form.** Today's real network surface is narrow —
      `services/currency.ts` calls the Frankfurter exchange-rate API
      with only currency codes, no personal data — so the form should
      be simple to fill honestly right now. Must be revisited the
      moment Dropbox backup, analytics, or crash reporting is added; a
      stale form is one of the most common suspension/rejection causes.

### Monetization
- [ ] §7 already flags "one-time purchase" as confirmed but unscoped
      (Claude features' pricing model still undecided). Not yet
      built: no `expo-iap`/RevenueCat in `package.json`. When it is
      built: must go through Google Play Billing (not
      Stripe/Razorpay/etc. — grounds for rejection), needs a Restore
      Purchases flow, needs the Payments Merchant account (separate
      verification queue from the developer-account ID check, start
      early), and needs testing via an EAS dev-client build (IAP
      can't be tested in Expo Go).

### Accounts & process
- [ ] Google Play Developer account ($25, individual, government-ID
      verification, few days to a week) — not started.
- [ ] Google Payments Merchant account — only needed once
      monetization is built; separate KYC queue from the developer
      account, start it early once IAP is scoped.
- [ ] **Closed testing (12 opted-in testers, 14 continuous days).**
      Mandatory for personal developer accounts created after Nov
      2023, and the single longest lead-time item in the whole
      process. Can run in parallel with development once the app
      reaches a stable/demoable state — don't wait for 100% feature
      completion to start this.

---
*Once this file reflects what you want, the next step is setting up a
new Claude Code project for this app — separate from the existing web
app's project — and starting the build.*
