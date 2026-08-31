# Privacy Policy

**Live at: https://meliordevelopments.github.io/erebor-wealth-management-pp/**
(published 2026-08-28, dedicated public repo
`meliordevelopments/erebor-wealth-management-pp` + GitHub Pages, per
spec.md §9's decision not to use a raw GitHub blob link). This file is
the content source — keep it in sync with the live page whenever this
policy changes.

_Last updated: August 28, 2026_

## Summary

Erebor Wealth Management is a **local-first** personal finance app. Your
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

If you choose to connect Dropbox (Profile → Dropbox Backup), the app
can back up your data — automatically once a day, and manually
whenever you ask — directly to a dedicated folder in **your own**
Dropbox account. We never see, store, or have access to your backup
files or your Dropbox account: the app is only ever granted access to
that one sandboxed folder (not your whole Dropbox), and every backup
and restore happens directly between your device and Dropbox's
servers.

Connecting Dropbox uses Dropbox's own login and consent screen — we
never see your Dropbox password. We store the resulting connection
token securely on your device (in the OS's encrypted keychain/
keystore, not in the app's regular data) so the app can back up on
your behalf without asking you to log in every time; disconnecting
Dropbox from Profile deletes that token from your device immediately.

## Children's privacy

This app is not directed at children and does not knowingly collect
data from anyone, since it does not collect personal data from any
user in the first place.

## Changes to this policy

If this policy changes — most likely triggered by a new feature that
talks to a new third party — we'll update the "Last updated" date
above and, for any material change, note what changed.

## Contact

For privacy questions, contact meliordevelopments@gmail.com.
