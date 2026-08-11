# Spending Tracker Mobile — Draft Spec (v1)

> **This is a separate, new product** — forked from the spec for the
> original web app (which stays as-is, for personal use, hosted on
> Supabase). This spec drops the "must also work as a website" goal and
> is built mobile-only, local-first, from scratch, carrying over the
> feature decisions, business logic, and lessons learned from that
> project. Edit freely before we start building.

## Status Dashboard

_Kept current per CLAUDE.md's Idea Backlog Protocol — updated the
moment a status genuinely changes, not batched. Last updated: 2026-08-11._

**Legend:** ✅ Built & Verified (built *and* confirmed working on a
real device/build) · 🚧 In Progress (code exists, not yet verified, or
partially built) · 📋 Planned (not started) · ⏸️ Deferred (intentionally
pushed to a later phase) · ❌ Dropped (cut from scope).

| Section | Feature | Status | Notes |
|---|---|---|---|
| §5.1 | Accounts | 🚧 In Progress | Built, incl. the distinct Credit Card ring; on-device verification still pending |
| §5.2 | Transactions | 🚧 In Progress | Entry/edit/list/filters/calendar built; recurring transactions ⏸️ deferred to Phase 2 |
| §5.3 | Categories | 🚧 In Progress | Full CRUD + starter seed built |
| §5.3a | Tags | 🚧 In Progress | Inline creation + per-tag summary (with currency conversion) built |
| §5.4 | Spending Summary | 🚧 In Progress | Month nav, net worth, Indian formatting built; Carry Forward + pie charts ⏸️ deferred to Phase 2 |
| §5.5 | Budget Mode | 🚧 In Progress | Toggle + schema built; spend-vs-budget comparison not yet wired in (⏸️ Phase 2) — toggling it has no visible effect yet |
| §5.6 | Show/Hide Future Transactions | 🚧 In Progress | Toggle + schema built; filtering not yet applied (⏸️ Phase 2) — same as above |
| §5.7 | Smart Features (Claude) | ⏸️ Deferred | Phase 4. Inert FAB placeholder only |
| §5.8 | Dashboard | 🚧 In Progress | Built |
| §5.9 | Navigation | 🚧 In Progress | Built |
| §5.10 | Profile Page | 🚧 In Progress | Built; Dropbox section is an inert placeholder |
| §5.11 | Home Screen Widget | ⏸️ Deferred | Phase 5 |
| §3 | Dropbox Backup/Restore | ⏸️ Deferred | Phase 3 |

Nothing is marked ✅ yet — Phase 1 is code-complete and type-checked,
but real on-device verification (spec §8, Next Priorities) hasn't run
yet, so nothing has cleared the bar for "Verified."

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
  toward zero). Credit Card accounts have an optional **Credit Limit**
  field, which enables:
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
- Accounts can be in a **currency other than INR** (e.g. a Dirham cash
  account). The app converts the balance to INR using a live/real-time
  exchange rate for any total that mixes currencies
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
- **Budget limits are set per account, not per category.** When Budget
  Mode is turned on for an account, it asks for that account's **monthly
  budget amount**
- Once set, the app can compare actual spending on that account against
  its budget (e.g. in the account's own ring/summary view)

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
- The first screen you see after logging in
- Shows an at-a-glance overview of your whole financial picture:
  - Overall balance across all accounts (in INR)
  - The balance ring/progress view (income vs. expense for the current month)
  - A list of your accounts with individual balances
  - Recent transactions (a short list, with a link to see all)
  - Quick access to the Income / Expense / Transfer actions
- Acts as the "home base" you can always return to

### 5.9 Navigation 🚧 In Progress
- A persistent bottom tab bar to move between the main sections
  (Dashboard, Accounts, Transactions, Categories, Profile) from
  anywhere in the app
- The floating Claude assistant icon (section 5.7) stays visible and
  accessible no matter which page you're on

### 5.10 Profile Page 🚧 In Progress
- No account/login (see section 4), so no email, password, or sign-out —
  this page becomes local app preferences instead: a local display name
  (optional, cosmetic only), Dropbox connection status/management,
  currency/date-format preferences

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

## 6. Explicitly out of scope for v1

(Move these up if you want them sooner — just say so.)

- Dark mode / theme customization
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
- [ ] **App Store / Play Store submission specifics** — developer
      account setup, review guideline considerations for a finance app,
      screenshots/listing content — not yet scoped out.
- [ ] (Add your own notes here)

---

## 8. Build Progress

_Last updated: 2026-08-11. Maintained per CLAUDE.md's Idea Backlog
Protocol — kept current as work lands, not written once and forgotten._

Build is phased (Phase 1 = core offline ledger, Phase 2 = recurring +
budgets + summary polish, Phase 3 = Dropbox backup, Phase 4 = Claude
smart features, Phase 5 = widget + store prep). **Phase 1 is complete
and type-checks clean; on-device verification on a physical Android
device is the one remaining Phase 1 step, blocked on local Android
build tooling being set up.**

### Built and working (Phase 1)

- **§5.1 Accounts** — full CRUD, all 5 account types, opening balance
  materialized as a real flagged transaction row, credit limit field,
  account list + detail page with the balance ring scoped to that
  account's period, the 3 Income/Expense/Transfer buttons.
- **§5.1 Credit Card ring** — `CreditUsageRing` is a distinct component
  from the regular `BalanceRing` (not a shared generic with a mode
  flag), per an explicit correction during planning: fill = % of
  credit limit used, center figure = net amount owed, second warning
  lap when over the limit.
- **§5.2 Transactions** — entry form for Income/Expense/Transfer,
  edit/delete, transactions list with account/category/date filters,
  summary band, calendar view with per-day expense totals.
- **§5.3 Categories** — separate Expense/Income lists, full CRUD,
  starter categories auto-seeded on first launch.
- **§5.3a Tags** — inline creation at entry time, per-tag summary view
  with income/expense/net converted to a common base currency across
  accounts (spec's own trip example spans multiple accounts/currencies,
  so this was built properly rather than deferred).
- **§5.4 Spending Summary (partial)** — month navigation, Income/Expense
  as plain figures alongside the ring, "All Accounts" total as a true
  net-worth figure with credit card debt broken out as its own line,
  Indian numbering format (`₹1,53,168.00`) throughout. Carry Forward
  and the monthly pie charts are correctly deferred to Phase 2 (see
  below) — not a gap, a planned sequencing choice.
- **§5.8 Dashboard** — net-worth ring, accounts list, recent
  transactions, quick Income/Expense/Transfer actions.
- **§5.9 Navigation** — bottom tab bar (Dashboard/Accounts/Transactions/
  Categories/Profile); a disabled placeholder FAB occupies the Claude
  assistant's slot so the layout matches what Phase 4 will fill in.
- **§5.10 Profile** — display name, global Budget Mode / Show Future
  Transactions toggles, base currency preference. Dropbox section shows
  a disabled "coming soon" state (Phase 3), not a broken control.
- Multi-currency conversion via Frankfurter v2, cached 6h in
  `exchange_rate_cache`, used for the Dashboard net-worth total and tag
  summaries.
- 10 Jest unit tests (`__tests__/`) covering `services/balance.ts`
  (transfer sign convention, period-range filtering, credit card owed
  calc) and `services/currency.ts` (cache hit/miss/expiry), run against
  an in-memory SQLite instance via `better-sqlite3` as a stand-in for
  `expo-sqlite`.

### Known gaps — fixed 2026-08-11

Both items below were flagged as gaps and have since been fixed
(type-checked + unit tests still passing; on-device confirmation still
pending along with the rest of Phase 1):

- **Foreign-currency dual display.** New `components/CurrencyAmount.tsx`
  shows both figures ("AED 500.00 · ≈ ₹11,310.00") and is now used
  everywhere a per-account amount appears: `TransactionListItem`, the
  account detail page's Income/Expense/Balance/Available-credit
  figures, and the Dashboard's per-account balance row. Already-
  aggregated totals (Dashboard's Overall Balance, Income, Expense) are
  intentionally left as plain INR — they're sums across accounts, not
  one account's own figure, so there's no second currency to show.
- **`TransactionForm`'s initial amount-field text** now looks up the
  actual account's currency (via a lazy `useState` initializer plus a
  one-time corrective `useEffect` for when the accounts list hasn't
  loaded yet on first render) instead of assuming INR.

### Deliberately deferred (per the approved phase plan)

- **Budget Mode / Show Future Transactions enforcement.** The toggles,
  schema fields (including per-account `budgetMonthlyMinor`), and
  Settings/account-edit UI all exist and persist correctly — but
  nothing reads them yet (`services/settings.ts`'s
  `resolveAccountSettings` is written but unused so far). Toggling
  either setting today has no visible effect. This is Phase 2 work
  (applying the resolved settings to Dashboard/account detail/
  Transactions list), not a bug.
- **§5.2 Recurring transactions** — the "make recurring" toggle,
  schedule fields, and materialization engine are Phase 2.
- **§5.4 Carry Forward line + monthly pie charts** — Phase 2.
- **§3 Dropbox backup/restore** — Phase 3. Profile page has an inert
  placeholder.
- **§5.7 Claude-powered smart features** — Phase 4, including the
  serverless API-key proxy. FAB slot exists and is inert, matching
  spec §5.9's "stays visible" requirement without implying it works.
- **§5.11 Home-screen widget** — Phase 5.

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

1. Fix the two Known Gaps above (dual-currency display, the
   TransactionForm currency-assumption bug).
2. Finish Phase 1's one remaining step: on-device golden-path
   verification, currently blocked on local Android build tooling.
3. Phase 2, in the order listed in the phase plan: recurring
   transactions → Budget Mode/Show-Future-Tx enforcement → Carry
   Forward + pie charts.

---
*Once this file reflects what you want, the next step is setting up a
new Claude Code project for this app — separate from the existing web
app's project — and starting the build.*
