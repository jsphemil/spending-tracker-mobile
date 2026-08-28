# Starting Play Store Closed Testing — Step by Step

Closed testing is the single longest lead-time item before this app
can go live (12 opted-in testers, 14 *continuous* days, mandatory for
personal developer accounts created after Nov 2023). This is why it's
worth starting now rather than waiting until everything else is done.

Most of this is manual work only you can do (account creation,
payment, identity verification, Play Console clicks) — I've noted
where I can help directly.

---

## 1. Create your Google Play Developer account

- Go to [play.google.com/console/signup](https://play.google.com/console/signup)
- Sign in with the Google account you want tied to this app
  permanently (hard to change later)
- Choose **account type**: "Individual" is simplest unless you're
  incorporating a business
- Pay the **$25 one-time registration fee**
- Complete **identity verification** — a government-issued ID upload.
  Google states this can take a few days up to a week.

**This is the actual blocker for everything below** — nothing else in
this guide can happen until this is approved.

---

## 2. While you wait: I'm building the production AAB

I've already kicked off `eas build --platform android --profile
production` — it builds a signed `.aab` (Android App Bundle, what Play
Store requires — not the `.apk` used for device testing) on Expo's
build servers, using the existing remote keystore. Takes roughly
10-15 minutes. I'll let you know when it's done and give you the
download link from your [Expo dashboard](https://expo.dev/accounts/jsphemil/projects/spending-tracker-mobile/builds).

---

## 3. Once your developer account is approved: create the app in Play Console

- Play Console → **Create app**
- App name: `Erebor Wealth Management`
- Default language: English (or your choice)
- App or game: **App**
- Free or paid: your call (spec.md's monetization decision is still
  open — closed testing works either way, this can change later)
- Package name is fixed to `com.jsphemil.spendingtracker` (already
  set in `app.json`, can't be changed after first upload)

Play Console will also ask you to complete some initial setup pages
(App content, Store settings) — that's a small amount of admin, not
the full store listing, and it's require before you can add the app
to any testing track.

---

## 4. Set up the closed testing track

- In Play Console: **Testing → Closed testing**
- Create a new track (e.g. "Closed testing")
- **Upload the AAB** I built in step 2 (drag-and-drop the `.aab` file,
  or download it from the Expo dashboard link first)
- **Add testers** — two options:
  - **Email list**: paste in email addresses directly in Play
    Console (simplest for a small group of friends/family/colleagues)
  - **Google Group**: create a Google Group, add testers to it, link
    the group in Play Console (better if you expect to swap testers
    in/out over time)
- You need **at least 12 testers who actually opt in and install the
  app** — just adding emails isn't enough, each person has to click
  the opt-in link Play Console gives you and install through it
- Once you save, Play Console gives you an **opt-in URL** — send that
  to your testers with instructions to open it, tap "Become a
  tester," then install from the Play Store link it shows

---

## 5. Recruit your 12 testers

You need real people, not bots — friends, family, coworkers, or
anyone willing to install and poke at a finance app for two weeks.
Practical tips:
- Give them a short "what to test" note so their usage looks like
  real usage, not a bounce (e.g. add an account, log a few
  transactions, check the dashboard) — Play Console does look at
  whether testers are engaging, not just installed-and-forgot
- The 14-day clock is continuous and starts once you have ≥12 opted-in
  testers with the app installed — recruit everyone as close together
  as possible so the clock starts sooner

---

## 6. After 14 days

Once the 14-day window closes with ≥12 active testers, Play Console
unlocks **Production** access for this app — you can then promote a
build from closed testing straight to production, or continue
iterating in closed testing first.

---

## What I can help with along the way

- Building new AABs whenever you need an updated build for testing
  (`eas build --platform android --profile production`)
- Setting up `eas submit` for direct-from-CLI uploads to Play Console,
  once you've generated a Play Console API service-account key (Play
  Console → Setup → API access) — saves you a manual upload each time
- Drafting the "what to test" note for your testers
- Tracking this in `spec.md`'s Status Dashboard as it progresses

I can't create the developer account, pay the fee, verify your
identity, or click through Play Console myself — those all need to be
you, in your own browser, logged in as you.
