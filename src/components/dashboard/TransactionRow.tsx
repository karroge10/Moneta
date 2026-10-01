'use client';

import type { Transaction } from '@/types/dashboard';
import { formatMoney } from '@/lib/format';
import { useCurrency } from '@/hooks/useCurrency';
import { cx } from '@/components/ui/cx';
import NamedIcon from '@/components/dashboard/NamedIcon';

interface TransactionRowProps {
  transaction: Transaction;
  onClick?: (transaction: Transaction) => void;
}

/**
 * One transaction in a card list: category icon, name, date and amount. Foreign-currency rows show
 * the original amount with the converted one below; rows without an exchange rate show only the
 * original amount and say the rate is missing, since `amount` then holds the unconverted number.
 */
export default function TransactionRow({ transaction, onClick }: TransactionRowProps) {
  const { currency } = useCurrency();
  const color = transaction.color || FALLBACK_COLOR;
  const amounts = describeAmounts(transaction, currency);

  const content = (
    <>
      <span
        className="icon-circle size-12 shrink-0"
        style={{ backgroundColor: `color-mix(in oklch, ${color} 10%, transparent)` }}
        aria-hidden="true"
      >
        <NamedIcon name={transaction.icon} width={24} height={24} strokeWidth={1.5} style={{ color }} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body font-medium leading-tight" title={transaction.name}>
          {transaction.name}
        </span>
        <span className="text-helper mt-0.5 block">{transaction.date}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end text-right">
        <span className="whitespace-nowrap text-body font-semibold tabular-nums">{amounts.primary}</span>
        {amounts.secondary && (
          <span className="whitespace-nowrap text-caption text-muted tabular-nums">{amounts.secondary}</span>
        )}
      </span>
    </>
  );

  const rowClass = 'flex w-full min-w-0 items-center gap-3 text-left';

  if (!onClick) return <div className={rowClass}>{content}</div>;

  return (
    <button
      type="button"
      onClick={() => onClick(transaction)}
      className={cx(rowClass, 'rounded-control transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-accent')}
    >
      {content}
    </button>
  );
}

const FALLBACK_COLOR = 'var(--color-accent)';

interface DisplayCurrency {
  symbol: string;
  alias: string;
}

function describeAmounts(transaction: Transaction, currency: DisplayCurrency): { primary: string; secondary: string | null } {
  const converted = Math.abs(transaction.amount);
  const original = Math.abs(transaction.originalAmount ?? transaction.amount);
  const originalSymbol = transaction.originalCurrencySymbol;

  if (!originalSymbol) {
    return { primary: formatMoney(converted, currency.symbol), secondary: null };
  }

  const primary = formatMoney(original, originalSymbol);
  if (isRateMissing(transaction, currency)) {
    return { primary, secondary: 'Rate unavailable' };
  }

  const isForeign = originalSymbol !== currency.symbol || converted !== original;
  const secondary = isForeign ? `≈ ${formatMoney(converted, currency.symbol)}` : null;
  return { primary, secondary };
}

/**
 * The API flags missing rates with `rateMissing` on newer responses. Older dashboard rows only signal
 * it by sending the unconverted figure as `amount` for a currency that differs from the user's.
 */
function isRateMissing(transaction: Transaction, currency: DisplayCurrency): boolean {
  if (transaction.rateMissing !== undefined) return transaction.rateMissing;
  const alias = transaction.originalCurrencyAlias;
  const isOtherCurrency = alias !== undefined && alias !== currency.alias;
  const sameFigure = transaction.originalAmount !== undefined && Math.abs(transaction.originalAmount) === Math.abs(transaction.amount);
  return isOtherCurrency && sameFigure;
}
