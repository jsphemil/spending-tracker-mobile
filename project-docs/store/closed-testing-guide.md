# Starting Play Store Closed Testing — Step by Step

Closed testing is the single longest lead-time item before this app
can go live (12 opted-in testers, 14 *continuous* days, mandatory for
personal developer accounts created after Nov 2023). This is why it's
worth starting now rather than waiting until everything else is done.

Most of this is manual work only you can do (account creation,
payment, identity verification, Play Console clicks) — I've noted
where I can help directly, and updated each step below with what's
actually been done so far (last updated 2026-08-30).

---

## 1. Create your Google Play Developer account — ✅ Done

Confirmed ready 2026-08-30 (account, $25 fee, identity verification all
complete).

---

## 2. Production AAB builds

Built via `eas build --platform android --profile production`, signed
with the EAS-managed remote keystore (Build Credentials `uwbFl8AYVm`) —
release builds never touch the local debug keystore. `eas.json`'s
`autoIncrement: true` bumps the version code automatically each run.

- **versionCode 2** — first production AAB, built 2026-08-28.
- **versionCode 3** — built 2026-08-29 after a full code-readiness
  pass (dependency alignment via `expo install --fix`, splash-screen
  white-flash fix, in-app privacy policy link). This is the one that
  got consumed by the **Internal testing** track
  (`play.google.com/apps/internaltest/4701175184982946045`), which is
  why it couldn't be reused for Closed testing — Play requires a
  unique version code across *every* track, not just per-track.
- **versionCode 4** — in progress 2026-08-30, triggered specifically
  for the Closed testing track upload. This build also does **not**
  yet include R8/resource shrinking (see the note below) — that's
  deliberately being held for a separate, dedicated build so it can be
  tested in isolation.

**Follow-up planned, not yet built:** `app.json` now has the
`expo-build-properties` plugin configured
(`enableProguardInReleaseBuilds` + `enableShrinkResourcesInReleaseBuilds`,
both `true`) per
[Android's app optimization guide](https://developer.android.com/topic/performance/app-optimization/enable-app-optimization) —
smaller AAB, obfuscated release code. Deliberately **not** bundled into
versionCode 4, since R8 can strip reflection-based code native modules
rely on (Dropbox OAuth, `expo-secure-store`, the Glance widget) and
this needs its own dedicated device-testing pass (specifically:
Dropbox connect/backup/restore, and the home screen widget) before
it's trusted for a real release.

---

## 3. Create the app in Play Console — ✅ Done

- App name: `Erebor Wealth Management`
- Package name: `com.jsphemil.spendingtracker` (fixed, matches
  `app.json`)
- App or game: App

---

## 4. App content declarations — ✅ Done (2026-08-30)

Every required declaration walked through and answered based on what
the app's code actually does:

| Declaration | Answer | Why |
|---|---|---|
| Privacy policy | `https://meliordevelopments.github.io/erebor-wealth-management-pp/` | Hosted page, see spec.md §9 |
| Sign-in details | No account creation; no login with external accounts | App has no login/account system at all — Dropbox OAuth is an optional backup feature, not app authentication |
| Ads | No | No ad SDK anywhere in the project |
| Content rating (IARC) | Everyone-tier expected | No violence/gambling/mature content/user-generated content questionnaire answers |
| Target audience | Done (prior session) | General/adult financial tool |
| Data safety | Email address + Other financial info, both Collected + Shared, encrypted in transit, both optional/App-functionality-only | The full local database — including the connected Dropbox email in the `settings` table — travels to the user's own Dropbox on every backup via `VACUUM INTO`; see the full walkthrough further down for the exact reasoning per field |
| Government apps | No | Not applicable |
| Financial features | "My app doesn't provide any financial features" | Manual-entry budget tracker only — no loans, payments, trading, or advice |
| Health | No | Not applicable |
| Advertising ID | No | No ad SDK reads or transmits it |

### Data safety — the exact reasoning (for future reference)

Only two data types are declared, both because the entire local SQLite
database — every table, including `settings` — gets bundled by
`VACUUM INTO` and uploaded to Dropbox whenever backup runs:

- **Personal info → Email address** — the connected Dropbox account
  email, stored in `settings.dropboxAccountEmail`.
- **Financial info → Other financial info** — accounts, transactions,
  balances, categories, budgets.

For both: Collected **and** Shared (data leaves the device to a third
party, Dropbox); not processed ephemerally (persisted indefinitely
until the user disconnects/deletes the backup); optional (Dropbox
backup is fully opt-in, the app works completely without it); purpose
is **App functionality** only for both collection and sharing — no
analytics, ads, personalization, or account-management use, since
Erebor has no account system of its own.

Everything else (location, health, messages, photos, contacts, app
activity/analytics, crash logs, device IDs) is correctly left
unchecked — no permissions requested, no analytics/crash-reporting SDK
in the project, and CSV export goes through Android's native Share
sheet (exempt as user-directed sharing).

---

## 5. Store settings & listing — ✅ Done (2026-08-30)

- **Category:** Finance
- **Contact email:** `meliordevelopments@gmail.com`
- **Store listing text** (title, short + full description) — copied
  directly from `store-listing.md`, already drafted.
- **Graphics** — icon, feature graphic, 7 screenshots, all in
  `project-docs/store/assets/`.

---

## 6. Set up the closed testing track — 🚧 In progress

Track name: **"EWM Alpha."**

- **Testers:** using a **Google Group** (not an email list) so
  strangers from tester-recruitment communities can self-join without
  handing over their email individually.
  - Group: `erebor-wealth-management-testers@googlegroups.com`,
    set to "Anyone on the web can join."
  - Feedback email on the track: `meliordevelopments@gmail.com`
  - Both "Join on Android" and "Join on the web" enabled.
- **Release:** uploading versionCode 4 (see step 2) with the release
  notes below.
- **Next:** Preview and confirm the release → **Send the release to
  Google for review** (a newer requirement — even closed tracks need a
  first-time review before testers can join; can take hours to a
  couple of days for a brand-new app) → once the track flips from
  "Inactive" to "Active," the real tester opt-in link appears on the
  Testers tab, in the form:
  ```
  https://play.google.com/apps/testing/com.jsphemil.spendingtracker
  ```
  **Important:** this is different from the Internal testing opt-in
  link (`/apps/internaltest/...`) and from the plain Play Store listing
  URL (`/store/apps/details?id=...`) — neither of those work for a
  stranger who hasn't already opted into the closed test.

**Release notes used (versionCode 4):**
```
<en-GB>
Track spending across every account - bank, credit card, cash, and more - entirely on your device. No login, no server holding your data.

- Multiple accounts and currencies
- Recurring transactions, categories, budgets
- Net worth tracking and savings goals
- Optional Dropbox backup, CSV export

Offline. One-time purchase. No ads.
</en-GB>
```
(Kept to plain ASCII — the earlier version with em dashes/bullet
characters tripped Play's byte-based length limit even though it was
under the displayed character count.)

---

## 7. Recruit your 12 testers — 📋 Not started (blocked on step 6)

Plan, based on a tester-recruitment write-up the user found ([How to
find 12 testers for your Android App](https://medium.com/@ingrid_dev/how-to-find-12-testers-for-your-android-app-8b9b643fe684)):

- **Aim for 20-30 testers, not just 12** — some will drop off or fail
  Google's activity bar.
- **Testers Community app** (`com.testerscommunity` on Play Store) —
  a mutual-testing platform using "Packs" of 16 developers who commit
  to daily engagement with each other's apps for 16 days. Requires
  spending "credits" (earned by testing others' apps) to list your own.
- **r/TestersCommunity** on Reddit — post the closed-testing opt-in
  link once it exists, with a short description (reuse the store
  listing's short description), and reciprocate by testing others'
  apps.
- **Push a few small updates during the 14-day window** — signals an
  actively-maintained app for the production-access review afterward.
- Give testers a short "what to test" note (add an account, log a few
  transactions, check the dashboard) so usage looks real, not a bounce
  — Play looks at engagement, not just install count.
- The 14-day clock is continuous and starts once ≥12 opted-in testers
  have the app installed — recruit everyone as close together as
  possible.
- **If the free routes (Testers Community app + r/TestersCommunity)
  don't produce enough real testers in time**, Testers Community also
  sells a paid guarantee:
  [pricing](https://www.testerscommunity.com/pricing#plans) — Starter
  (₹999, 15 testers) or Pro (₹1,699, 25 testers), both one-time,
  6-hour tester delivery, full 14-day period, "production access
  guarantee" (approved or money back), plus feedback reports and
  pre-filled production-access-form answers. Fallback only — try free
  recruitment first.

---

## 8. Publish at least 3 updates during the 14-day window — 📋 Not started

Per Testers Community's ["Google Play production access rejected"
write-up](https://www.testerscommunity.com/blog/google-play-production-access-rejected?source=email),
the three most common rejection reasons are: an incomplete
production-access form, **no app updates during the testing window**,
and weak/unconvincing tester engagement evidence. Shipping a static
build for the full 14 days — even a bug-free one — reads as
un-maintained.

**Plan for this app:** publish 3 closed-testing releases against
versionCode 4 (the current live "EWM Alpha" release), each a real,
user-visible change with honest release notes — not padding. Natural
candidates already identified in this project:
1. A genuine small fix or polish item that comes up from tester
   feedback or normal development during the window (preferred — real
   feedback-driven change is exactly what Google wants documented).
2. The R8/ProGuard + resource-shrinking build
   (`expo-build-properties` already configured in `app.json`, see
   step 2 above) — **but only after it's been dedicated-tested**
   (Dropbox connect/backup/restore, the home screen widget) outside
   of closed testing first, since R8 can silently break
   reflection-based native code. Don't ship an untested R8 build to
   real testers as one of the 3.
3. A third small improvement — copy fix, minor UI polish, or whatever
   is next in the backlog at the time.

**How to push each update to the existing closed testing track (not a
new track):**
1. Make the code change, verify it (`tsc`, `jest`, manual check).
2. `eas build --platform android --profile production
   --non-interactive` — `autoIncrement: true` in `eas.json` bumps the
   version code automatically; no manual version bump needed.
3. Play Console → this app → **Testing → Closed testing → EWM Alpha**
   → **Create new release**.
4. Upload the new `.aab`, keep the same deobfuscation-file behavior as
   before (upload if R8 is on, skip if not).
5. Write real release notes describing what actually changed — this
   is exactly what production-access reviewers read.
6. Save → Review release → **Send for review** (only needed again if
   Play flags something; routine updates to an already-approved track
   are usually faster than the first release).
7. Testers already opted into the track get the update automatically;
   no need to re-share opt-in links.

**Reusable knowledge for future app projects:** ship-3-updates and
"engagement over install count" are Play Store policy realities, not
specific to this app — worth applying the same pattern (small
real changes, honest notes, feedback-driven where possible) to any
future closed-testing period before requesting production access.

---

## 9. Production access application — 📋 Not started

Once the 14-day window closes with ≥12 active testers **and** at
least 3 releases have shipped (step 8), Play Console unlocks
**Production** access — a build can then be promoted from closed
testing straight to production.

The application form itself is a common rejection point even after a
successful test period. Per the same write-up:
- Answer all ~10 questions with **250-300+ characters each** — short
  answers read as low-effort.
- Describe tester recruitment concretely (which channels — Testers
  Community app, r/TestersCommunity, Google Groups — not just "friends
  and family").
- Describe specific feedback received and the specific changes made in
  response (tie back to the 3 release notes from step 8).
- Describe app readiness beyond "minor bug fixes" — what was actually
  verified working.
- Mention how feedback was collected (Reddit replies/DMs, group
  messages, direct testing notes) — screenshots/emails as evidence if
  available.
- Check the **Pre-Launch Report** in Play Console beforehand and fix
  anything flagged; keep total open issues low (aim under ~10).

---

## What I can help with along the way

- Building new AABs whenever an updated build is needed
  (`eas build --platform android --profile production`)
- Setting up `eas submit` for direct-from-CLI uploads to Play Console,
  once a Play Console API service-account key exists (Play Console →
  Setup → API access)
- Drafting tester-facing copy (group descriptions, welcome messages,
  "what to test" notes, release notes)
- Tracking this in `spec.md`'s Status Dashboard / §9 as it progresses

I can't create the developer account, pay the fee, verify identity,
join the Google Group as an outside tester, or click through Play
Console myself — those all need to be done by the user, logged in as
themselves.
