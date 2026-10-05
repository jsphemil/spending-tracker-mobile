import { useState } from "react";
import { Link, useRouter, type Href } from "expo-router";
import { Modal, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useFunds } from "../db/queries/funds";
import { useTransactionTags } from "../db/queries/tags";
import type { transactions } from "../db/schema";
import { formatMoney } from "../services/format";
import { useThemeColors } from "../theme/palette";
import { CurrencyAmount } from "./CurrencyAmount";
import { Icon } from "./ui/Icon";

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
   * The account the transaction belongs to, shown on the meta line — one
   * row layout everywhere (spec.md §5.3a, 2026-09-15). For a transfer this
   * is the source account; the title already names both. Omitted by the
   * row itself when the list is already scoped to this account
   * (viewingAccountId matches), where it would repeat on every row.
   */
  accountName?: string;
  /**
   * A tag to leave out of the chip row — the tag summary passes its own
   * name, since every row on that screen carries it by definition.
   */
  hideTag?: string;
  /**
   * The account whose own list this row is rendered in (Account Detail
   * page, or Transactions filtered to one account) — lets a transfer show
   * a direction-aware sign: "-" leaving this account, "+" arriving into
   * it. Omitted in unscoped "all accounts" views, where a transfer has no
   * single natural viewpoint and stays unsigned.
   */
  viewingAccountId?: number | null;
  /** False in lists already grouped under day headings. */
  showDate?: boolean;
  /**
   * Called from the long-press sheet's Delete — owns its own confirmation
   * UX (a plain confirm for a normal row, or the "just this one/this and
   * future" scope picker for a recurring one), since only the caller knows
   * which case it's dealing with. Without it the sheet offers no Delete.
   */
  onDelete?: () => void;
}

// Amount colour follows DESIGN.md §4: spending stays neutral (the "−"
// carries it), income is positive, transfers are their own colour.
const AMOUNT_STYLE = {
  income: "text-success",
  expense: "text-fg",
  transfer: "text-transfer",
} as const;

// One transaction row (spec.md §5.24): tap to edit, long-press for Edit /
// Duplicate / Delete. V2's three always-visible icons per row are gone.
export function TransactionListItem({
  transaction,
  currency,
  categoryName,
  fromAccountName,
  toAccountName,
  accountName,
  hideTag,
  viewingAccountId,
  showDate = true,
  onDelete,
}: TransactionListItemProps) {
  const rowTags = useTransactionTags(transaction.id).filter((tag) => tag.name !== hideTag);
  const colors = useThemeColors();
  const [actionsOpen, setActionsOpen] = useState(false);
  // One live query per row, same as the tag names above — funds is a tiny
  // table (a handful of rows), so looking the name up here keeps this row
  // self-contained rather than threading a fund name through every screen
  // that renders it.
  const { data: funds } = useFunds();
  const linkedFund =
    transaction.fundId != null ? funds?.find((f) => f.id === transaction.fundId) : undefined;

  const category = categoryName ?? "Uncategorized";
  const note = transaction.isOpeningBalance ? null : transaction.description?.trim() || null;
  // A note ("Claude Pro") names a row better than its category
  // ("Subscriptions"), so it leads when there is one and the category
  // moves to the meta line.
  const title = transaction.isOpeningBalance
    ? "Opening balance"
    : transaction.type === "transfer"
      ? `${fromAccountName ?? "?"} → ${toAccountName ?? "?"}`
      : (note ?? category);

  const meta = [
    transaction.type === "transfer" ? (note ? `Transfer · ${note}` : "Transfer") : note ? category : null,
    accountName && transaction.accountId !== viewingAccountId ? accountName : null,
    showDate ? transaction.date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : null,
    transaction.recurringRuleId != null ? "Recurring" : null,
  ].filter(Boolean);

  const sign =
    transaction.type === "expense"
      ? "−"
      : transaction.type === "income"
        ? "+"
        : viewingAccountId != null
          ? transaction.accountId === viewingAccountId
            ? "−"
            : "+"
          : "";

  // Opening-balance rows aren't editable via the normal transaction screen
  // (db/actions/transactions.ts blocks it) — route straight to the
  // account's own edit page instead, matching the real app's pattern.
  const editHref: Href = transaction.isOpeningBalance
    ? `/account/${transaction.accountId}/edit`
    : `/transaction/${transaction.id}/edit`;

  return (
    <View className="border-b border-border py-3">
      <Link href={editHref} asChild>
        <Pressable
          onLongPress={() => setActionsOpen(true)}
          accessibilityRole="button"
          accessibilityHint="Opens the transaction. Long-press for more actions."
          className="min-h-12 flex-row items-center justify-between active:opacity-70"
        >
          <View className="flex-1 pr-3">
            <Text className="text-base text-fg" numberOfLines={1}>
              {title}
            </Text>
            {meta.length > 0 && (
              <Text className="mt-0.5 text-xs text-fg-subtle" numberOfLines={1}>
                {meta.join(" · ")}
              </Text>
            )}
          </View>
          <CurrencyAmount
            amountMinor={transaction.amountMinor}
            currency={currency}
            prefix={sign}
            className={`text-base font-semibold ${AMOUNT_STYLE[transaction.type]}`}
          />
        </Pressable>
      </Link>
      {(linkedFund || rowTags.length > 0) && (
        <View className="mt-2 flex-row flex-wrap items-center gap-1.5">
          {/* Accent-tinted so a fund reads as a different kind of thing
              from the plain tag chips beside it. */}
          {linkedFund && (
            <Link href={`/fund/${linkedFund.id}`} asChild>
              <Pressable className="flex-row items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5">
                <Icon name={linkedFund.icon} size={11} color={colors.accent} />
                <Text className="text-xs text-accent">{linkedFund.name}</Text>
              </Pressable>
            </Link>
          )}
          {rowTags.map((tag) => (
            <Link key={tag.id} href={`/tag/${encodeURIComponent(tag.name)}`} asChild>
              <Pressable className="flex-row items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5">
                <Icon name={tag.icon} size={11} color={tag.color} />
                <Text className="text-xs text-fg-muted">{tag.name}</Text>
              </Pressable>
            </Link>
          ))}
        </View>
      )}
      {actionsOpen && (
        <TransactionActionsSheet
          title={title}
          amount={`${sign}${formatMoney(transaction.amountMinor, currency)}`}
          editHref={editHref}
          duplicateHref={transaction.isOpeningBalance ? undefined : `/transaction/new?duplicateId=${transaction.id}`}
          onDelete={transaction.isOpeningBalance ? undefined : onDelete}
          onClose={() => setActionsOpen(false)}
        />
      )}
    </View>
  );
}

// Long-press actions for one row. Delete is last, separated, and the only
// red item — present but never as prominent as the everyday actions.
function TransactionActionsSheet({
  title,
  amount,
  editHref,
  duplicateHref,
  onDelete,
  onClose,
}: {
  title: string;
  amount: string;
  editHref: Href;
  duplicateHref?: Href;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const colors = useThemeColors();
  const router = useRouter();
  const go = (href: Href) => {
    onClose();
    router.push(href);
  };

  return (
    <Modal visible animationType="slide" onRequestClose={onClose} transparent>
      <Pressable className="flex-1 justify-end bg-black/50" onPress={onClose}>
        <Pressable className="rounded-t-3xl bg-surface" onPress={(e) => e.stopPropagation()}>
          <SafeAreaView edges={["bottom"]}>
            <View className="items-center pt-3">
              <View className="h-1 w-10 rounded-full bg-border-strong" />
            </View>
            <View className="flex-row items-center justify-between gap-3 px-5 pb-2 pt-4">
              <Text className="flex-1 font-display text-lg text-fg" numberOfLines={1}>
                {title}
              </Text>
              <Text className="font-data text-base tabular-nums text-fg-muted">{amount}</Text>
            </View>
            <View className="pb-4">
              <SheetAction icon="pencil-outline" label="Edit" color={colors.fg} onPress={() => go(editHref)} />
              {duplicateHref && (
                <SheetAction icon="content-copy" label="Duplicate" color={colors.fg} onPress={() => go(duplicateHref)} />
              )}
              {onDelete && (
                <>
                  <View className="mx-5 my-1 h-px bg-border" />
                  <SheetAction
                    icon="trash-can-outline"
                    label="Delete"
                    color={colors.danger}
                    onPress={() => {
                      onClose();
                      onDelete();
                    }}
                  />
                </>
              )}
            </View>
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function SheetAction({ icon, label, color, onPress }: { icon: string; label: string; color: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="min-h-14 flex-row items-center gap-4 px-5 active:bg-glass-press"
    >
      <Icon name={icon} size={20} color={color} />
      <Text className="text-base" style={{ color }}>
        {label}
      </Text>
    </Pressable>
  );
}
