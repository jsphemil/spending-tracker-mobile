import { Icon } from "./ui/Icon";
import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { useTransactionTagNames } from "../db/queries/tags";
import type { transactions } from "../db/schema";
import { useThemeColors } from "../theme/palette";
import { CurrencyAmount } from "./CurrencyAmount";

type Transaction = typeof transactions.$inferSelect;

interface TransactionListItemProps {
  transaction: Transaction;
  currency: string;
  categoryName?: string;
  /**
   * Always "{from account} → {to account}", regardless of which account's
   * own list this row is rendered in — matches the real app's account-
   * agnostic transfer title exactly, so the same row reads the same way
   * whether you're viewing the source or destination account's history.
   */
  fromAccountName?: string;
  toAccountName?: string;
  /**
   * The account whose own list this row is rendered in (Account Detail
   * page, or Transactions filtered to one account) — lets a transfer show
   * a direction-aware sign: "-" leaving this account, "+" arriving into
   * it. Omitted in unscoped "all accounts" views (Dashboard, unfiltered
   * Transactions), where a transfer has no single natural viewpoint and
   * stays unsigned.
   */
  viewingAccountId?: number | null;
  /**
   * Renders small icon buttons on the right instead of making the whole
   * row a tap target — matches the real app everywhere it lists
   * transactions (Dashboard, Account Detail, Transactions list).
   */
  showActionIcons?: boolean;
  /**
   * Also shows a Duplicate icon (opens New Transaction prefilled from this
   * row). The real app has this on Account Detail and Transactions, but
   * not the Dashboard's card — same distinction here.
   */
  showDuplicateIcon?: boolean;
  /**
   * Called when the trash icon is tapped — owns its own confirmation UX
   * (a plain confirm for a normal row, or the "just this one/this and
   * future" scope picker for a recurring one), since only the caller
   * knows which case it's dealing with.
   */
  onDelete?: () => void;
}

const AMOUNT_STYLE = {
  income: "text-success",
  expense: "text-danger",
  transfer: "text-transfer",
} as const;

export function TransactionListItem({
  transaction,
  currency,
  categoryName,
  fromAccountName,
  toAccountName,
  viewingAccountId,
  showActionIcons = false,
  showDuplicateIcon = false,
  onDelete,
}: TransactionListItemProps) {
  const tagNames = useTransactionTagNames(transaction.id);
  const colors = useThemeColors();

  const title = transaction.isOpeningBalance
    ? "🏦 Opening balance"
    : transaction.type === "transfer"
      ? `${fromAccountName ?? "?"} → ${toAccountName ?? "?"}`
      : (categoryName ?? "Uncategorized");

  const sign =
    transaction.type === "expense"
      ? "-"
      : transaction.type === "income"
        ? "+"
        : viewingAccountId != null
          ? transaction.accountId === viewingAccountId
            ? "-"
            : "+"
          : "";

  // Opening-balance rows aren't editable via the normal transaction screen
  // (db/actions/transactions.ts blocks it) — route straight to the
  // account's own edit page instead, matching the real app's pattern.
  const editHref = transaction.isOpeningBalance
    ? `/account/${transaction.accountId}/edit`
    : `/transaction/${transaction.id}/edit`;

  const rowContent = (
    <>
      <View className="flex-1 pr-3">
        <Text className="text-base text-fg">{title}</Text>
        {transaction.description && !transaction.isOpeningBalance ? (
          <Text className="text-sm text-fg-muted">{transaction.description}</Text>
        ) : null}
        <Text className="text-xs text-fg-subtle">
          {transaction.date.toLocaleDateString()}
          {transaction.recurringRuleId != null ? " · 🔁" : ""}
        </Text>
      </View>
      <CurrencyAmount
        amountMinor={transaction.amountMinor}
        currency={currency}
        prefix={sign}
        className={`text-base font-semibold ${AMOUNT_STYLE[transaction.type]}`}
      />
    </>
  );

  return (
    <View className="border-b border-glass-border py-3">
      {showActionIcons ? (
        <View className="flex-row items-center justify-between">
          {rowContent}
          <View className="ml-2 flex-row items-center gap-1">
            {showDuplicateIcon && !transaction.isOpeningBalance && (
              <Link href={`/transaction/new?duplicateId=${transaction.id}`} asChild>
                <Pressable className="p-2" hitSlop={4}>
                  <Icon name="content-copy" size={15} color={colors.fgMuted} />
                </Pressable>
              </Link>
            )}
            <Link href={editHref} asChild>
              <Pressable className="p-2" hitSlop={4}>
                <Icon name="pencil-outline" size={16} color={colors.fgMuted} />
              </Pressable>
            </Link>
            {!transaction.isOpeningBalance && (
              <Pressable className="p-2" hitSlop={4} onPress={onDelete}>
                <Icon name="trash-can-outline" size={16} color={colors.fgMuted} />
              </Pressable>
            )}
          </View>
        </View>
      ) : (
        <Link href={editHref} asChild>
          <Pressable className="flex-row items-center justify-between">{rowContent}</Pressable>
        </Link>
      )}
      {tagNames.length > 0 && (
        <View className="mt-2 flex-row flex-wrap gap-1.5">
          {tagNames.map((name) => (
            <Link key={name} href={`/tag/${encodeURIComponent(name)}`} asChild>
              <Pressable className="rounded-full bg-surface-2 px-2 py-0.5">
                <Text className="text-xs text-fg-muted">{name}</Text>
              </Pressable>
            </Link>
          ))}
        </View>
      )}
    </View>
  );
}
