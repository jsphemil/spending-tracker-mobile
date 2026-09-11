// Help & Support content (spec.md §5.15 / §5.22). Static on purpose — the
// app has no server to fetch from, and every answer here describes a
// decision already written down in spec.md, so the two can be kept in step
// by hand. Keep answers short and concrete; the intro (Settings → Replay
// the intro) covers the big picture.

export interface FaqEntry {
  question: string;
  answer: string;
}

export interface FaqSection {
  id: string;
  title: string;
  icon: string;
  entries: FaqEntry[];
}

export const FAQ_SECTIONS: FaqSection[] = [
  {
    id: "getting-started",
    title: "Getting started",
    icon: "sparkles",
    entries: [
      {
        question: "Where do I begin?",
        answer:
          "Add your accounts first — bank accounts, cash, cards, deposits, investments. Then record income when money comes in and expenses when you spend. The Dashboard fills itself in from there.",
      },
      {
        question: "What does the Dashboard show me?",
        answer:
          "Three answers: where you stand (net worth, assets, debt, and what's earmarked in funds), how this month is going (income, spending, what's left), and what needs your attention (over-budget categories, commitments due soon, funds coming up on their date). You can choose which cards appear and in what order under Settings → Customise Dashboard.",
      },
      {
        question: "Can I see the introduction again?",
        answer:
          "Yes — Settings → Help & Support → Replay the intro. Replaying it also brings back the one-time hint cards on each screen.",
      },
    ],
  },
  {
    id: "accounts",
    title: "Accounts & balances",
    icon: "wallet-outline",
    entries: [
      {
        question: "Why does an account's balance change when I move to a different month?",
        answer:
          "The account screen shows the balance as of the end of the month you're viewing, so its Income and Expense figures right next to it line up. The Dashboard's net worth follows the same month you've paged to.",
      },
      {
        question: "What is 'Balance available'?",
        answer:
          "Your balance including everything dated up to the end of this month — so a salary or a bill that's already recorded for later this month is counted. The home screen widget shows the same figure.",
      },
      {
        question: "How do credit cards work?",
        answer:
          "A credit card account's balance is naturally negative — that's what you owe. The ring shows how much of your limit is used, and 'available credit' is the limit minus what's owed. Paying the card is a transfer from your bank account to the card, not an expense.",
      },
      {
        question: "Why can't I delete an account?",
        answer:
          "An account with transactions can't be deleted, so your history stays consistent. Delete or move its transactions first. An account that only has its opening balance deletes cleanly.",
      },
    ],
  },
  {
    id: "transactions",
    title: "Transactions & transfers",
    icon: "swap-horizontal",
    entries: [
      {
        question: "Is moving money between my own accounts an expense?",
        answer:
          "No. Record it as a Transfer. Both accounts update, and it never counts as spending or income — your wealth hasn't changed, it has just moved. Paying a credit card, topping up a wallet, or moving savings into an investment are all transfers.",
      },
      {
        question: "What's the difference between 'Actual spending' and my category totals?",
        answer:
          "Actual spending is every expense this month across all accounts, converted to your default currency. Category totals split that same spending by category; anything without a category shows as Uncategorized.",
      },
      {
        question: "Why don't I see next month's transactions?",
        answer:
          "Future-dated transactions can be hidden with the 'Show future transactions' switch under Settings → Account Details (and per account on its edit screen). Hiding only declutters the current month's lists — totals are never changed by it, and paging forward to a future month always shows what's there.",
      },
      {
        question: "Can I use a calculation in the amount field?",
        answer:
          "Yes — type an expression such as 1200+350 or 4500/3 and it's evaluated when you save.",
      },
    ],
  },
  {
    id: "recurring",
    title: "Recurring & Commitments",
    icon: "calendar-sync-outline",
    entries: [
      {
        question: "How do recurring transactions work?",
        answer:
          "Tick 'Make recurring' on a transaction and choose the pattern. Erebor creates the upcoming occurrences ahead of time so they appear in your lists and in the month you page to. Editing one lets you change just that occurrence or this and all future ones.",
      },
      {
        question: "What does Commitments show?",
        answer:
          "Every active recurring rule, normalised to a monthly amount — a yearly premium shows as one twelfth — and, when you have recurring income, what share of it is already committed.",
      },
      {
        question: "Can a recurring expense be paid from a Fund?",
        answer:
          "Yes. Pick the fund on the recurring rule and every occurrence draws from it as its month arrives — useful for an EMI you've pre-funded. Occurrences created ahead of time don't consume the fund early.",
      },
    ],
  },
  {
    id: "funds",
    title: "Funds",
    icon: "piggy-bank",
    entries: [
      {
        question: "What is a Fund?",
        answer:
          "Money you still own but have set aside for a specific purpose — a laptop, a trip, next year's insurance. Adding money to a fund moves nothing between accounts and doesn't change your net worth; it just marks that amount as spoken for.",
      },
      {
        question: "What are Earmarked and Unallocated?",
        answer:
          "Earmarked is the total held across your open funds. Unallocated is your net worth minus that — the part of your wealth not yet assigned to anything. It's unallocated net worth, not spendable cash: it still includes deposits and investments.",
      },
      {
        question: "How do I spend from a fund?",
        answer:
          "Record the expense normally and choose the fund on it. The fund's balance drops by that amount. If you edit or delete the expense later, the fund adjusts automatically — nothing to reconcile.",
      },
      {
        question: "What if the purchase costs more than the fund holds?",
        answer:
          "The expense is still recorded in full. The fund contributes what it holds and the rest visibly comes from unallocated wealth. A fund never blocks a purchase.",
      },
      {
        question: "What happens when I close a fund?",
        answer:
          "Whatever it still holds returns to unallocated. Closed funds stay in the list under Closed and can be reopened. A fund with no history can be deleted outright.",
      },
    ],
  },
  {
    id: "categories",
    title: "Categories & budgets",
    icon: "shape-outline",
    entries: [
      {
        question: "How do budgets work?",
        answer:
          "Give a category a monthly budget and its bar shows spend against it. Go over and the Dashboard's attention card says so. Budgets are in your default currency.",
      },
      {
        question: "What is Budget Mode on an account?",
        answer:
          "An account-level switch (Settings → Account Details, or per account) that shows the account's ring as spend against a monthly budget instead of as a plain balance.",
      },
    ],
  },
  {
    id: "currencies",
    title: "Currencies",
    icon: "calculator",
    entries: [
      {
        question: "Can accounts be in different currencies?",
        answer:
          "Yes. Each account keeps its own currency and its transactions are recorded in it. Anything that adds accounts together — net worth, monthly totals, category spend — is converted to your default currency.",
      },
      {
        question: "What happens if I change my default currency?",
        answer:
          "Every converted figure re-references the new currency immediately. Accounts and their transactions are untouched. Amounts you typed directly in the default currency — fund targets and category budgets — are not converted; they keep their number.",
      },
      {
        question: "Where do the exchange rates come from?",
        answer:
          "A public exchange-rate service, fetched when needed and cached on the device. No financial data is sent with the request. If a rate can't be fetched and none is cached, that currency is left out of totals and a note says so.",
      },
    ],
  },
  {
    id: "backup",
    title: "Backup & restore",
    icon: "shield",
    entries: [
      {
        question: "How do backups work?",
        answer:
          "Connect Dropbox under Settings → Backup & Restore. Erebor writes a complete snapshot of its database to an app-only folder in your own Dropbox — nothing passes through any other server. A backup runs automatically once a day when you open the app, and you can take one manually any time.",
      },
      {
        question: "How do I move to a new phone?",
        answer:
          "Install Erebor, connect the same Dropbox account, and pick a backup to restore. Everything — accounts, transactions, funds, settings — comes across in one go.",
      },
      {
        question: "Why does restoring ask me to restart the app?",
        answer:
          "A restore replaces the whole database file underneath the running app. Restarting is the simplest way to be certain every screen reads the restored data.",
      },
    ],
  },
  {
    id: "widgets",
    title: "Home screen widgets",
    icon: "view-dashboard-outline",
    entries: [
      {
        question: "What widgets are there?",
        answer:
          "Accounts shows one account at a time — tap the name to switch, resize to zoom — with Income, Expense and Transfer buttons that open the add screen with that account selected. Quick Add is the three buttons on their own. Long-press the app icon for the same shortcuts.",
      },
      {
        question: "The widget's balance doesn't match the app.",
        answer:
          "The widget shows 'Balance available' — the balance as of the end of this month, the same figure the account screen shows. It refreshes whenever the app writes data; if it looks stale, open the app once.",
      },
    ],
  },
  {
    id: "privacy",
    title: "Privacy & your data",
    icon: "shield",
    entries: [
      {
        question: "Where is my data stored?",
        answer:
          "On this device only, in a database inside the app's private storage. There is no account, no login, and no server operated by the developer. See Settings → Privacy & Security for the full policy.",
      },
      {
        question: "How does the app lock work?",
        answer:
          "Turn on 'Unlock with biometrics' under Settings → Privacy & Security. Erebor then asks for your fingerprint, face, or your phone's PIN or pattern when it opens, and again if it has been in the background for more than 30 seconds. Nothing is stored — your phone does the checking. The home screen widget keeps showing balances, since the home screen is already behind your phone's own lock.",
      },
      {
        question: "Why does the net worth card open hidden?",
        answer:
          "The Dashboard is the first thing on screen when the app opens, so its figures start masked. Tap the eye to reveal them for this session; they're masked again next time the app starts.",
      },
    ],
  },
];
