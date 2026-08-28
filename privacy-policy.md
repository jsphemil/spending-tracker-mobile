# Privacy Policy

**Draft — not yet published or legally reviewed.** Per `spec.md` §9,
this needs to be hosted at a public URL (decided: a dedicated small
public repo + GitHub Pages, not a raw GitHub blob link) before this
app can be submitted to the Play Store or App Store. This file is the
content draft; it is not yet live anywhere.

_Last updated: [DATE — fill in when published]_

## Summary

Spending Tracker is a **local-first** personal finance app. Your
financial data — accounts, transactions, categories, balances — is
stored only on your own device. We do not operate a server that
stores, sees, or has access to your financial data, and we do not
sell or share your data with anyone, because we never have it in the
first place.

## What data the app stores, and where

All the data you enter into the app (accounts, transactions,
categories, tags, goals, and your preferences) is stored locally on
your device, in a private database only the app itself can read — it
is not sent anywhere by default. If you uninstall the app or clear
its data, that data is gone unless you've backed it up yourself (see
below).

## What data leaves your device

The app makes network requests to exactly one third-party service:

- **[Frankfurter](https://frankfurter.dev)**, a free currency
  exchange-rate API, to convert between currencies (e.g. showing an
  AED account's balance in your INR total). These requests send only
  currency codes (e.g. "USD", "INR") — never any of your personal or
  financial data, account names, transaction details, or any
  identifier tied to you.

We do not use analytics, advertising, or crash-reporting services.
The app does not track you, does not build a profile of you, and does
not know who you are — there is no login or account system at all.

## Cloud backup (Dropbox)

[TO FILL IN once Dropbox backup ships per spec.md §3 — the intended
design: backups go directly from your device to a folder in **your
own** Dropbox account, authorized via Dropbox's own login. We never
see, store, or have access to your backup files or your Dropbox
account — the connection is between your device and Dropbox directly.
This section must be completed, and the Data Safety Play Console form
updated, before that feature ships to production.]

## Children's privacy

This app is not directed at children and does not knowingly collect
data from anyone, since it does not collect personal data from any
user in the first place.

## Changes to this policy

If this policy changes — most likely triggered by a new feature that
talks to a new third party — we'll update the "Last updated" date
above and, for any material change, note what changed.

## Contact

[TO FILL IN — an email address or contact method for privacy
questions; required for both Play Store and App Store submission.]
