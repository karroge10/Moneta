'use client';

import Spinner from '@/components/ui/Spinner';
import { cx } from '@/components/ui/cx';
import { formatDateForDisplay } from '@/lib/dateFormatting';
import { formatQuantity } from '@/lib/format';
import { formatSmartNumber } from '@/lib/utils';
import type { AssetDetailTransactionRow } from '@/types/investments';

interface AssetTransactionsTableProps {
  transactions: AssetDetailTransactionRow[];
  currencySymbol: string;
  /** Shows a spinner over the rows and blocks clicks. */
  busy: boolean;
  onSelect: (transaction: AssetDetailTransactionRow) => void;
}

/** Buys and sells of one asset; a row opens the edit dialog. */
export default function AssetTransactionsTable({ transactions, currencySymbol, busy, onSelect }: AssetTransactionsTableProps) {
  return (
    <section aria-labelledby="asset-transactions-heading">
      <h3 id="asset-transactions-heading" className="mb-4 text-ui font-medium">
        Transactions
      </h3>
      <div className="relative overflow-hidden rounded-card border border-line bg-surface-0" aria-busy={busy}>
        {busy && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/5 backdrop-blur-[1px]">
            <div className="flex items-center justify-center rounded-panel border border-line bg-surface-1 p-3 shadow-xl">
              <Spinner size={16} />
            </div>
          </div>
        )}
        <div className="max-h-[40vh] overflow-auto">
          <table className="w-full min-w-[560px] text-ui">
            <thead className="sticky top-0 z-10 bg-surface-0">
              <tr className="text-left text-caption uppercase tracking-wide text-muted">
                <th scope="col" className="px-5 py-3 align-top font-medium">Date</th>
                <th scope="col" className="px-5 py-3 align-top font-medium">Type</th>
                <th scope="col" className="px-5 py-3 text-right align-top font-medium">Quantity</th>
                <th scope="col" className="px-5 py-3 text-right align-top font-medium">Price</th>
                <th scope="col" className="px-5 py-3 text-right align-top font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => (
                <TransactionRow
                  key={transaction.id}
                  transaction={transaction}
                  currencySymbol={currencySymbol}
                  disabled={busy}
                  onSelect={onSelect}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

interface TransactionRowProps {
  transaction: AssetDetailTransactionRow;
  currencySymbol: string;
  disabled: boolean;
  onSelect: (transaction: AssetDetailTransactionRow) => void;
}

function TransactionRow({ transaction, currencySymbol, disabled, onSelect }: TransactionRowProps) {
  const isBuy = transaction.investmentType === 'buy';
  const quantity = Number(transaction.quantity);
  const price = Number(transaction.pricePerUnit);
  const symbol = transaction.currency?.symbol || currencySymbol;
  const select = () => {
    if (!disabled) onSelect(transaction);
  };

  return (
    <tr
      onClick={select}
      className={cx(
        'border-t border-line-subtle transition-colors',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-surface-1',
      )}
    >
      <td className="px-5 py-4 align-top">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            select();
          }}
          disabled={disabled}
          aria-label={`Edit ${isBuy ? 'buy' : 'sell'} on ${formatDateForDisplay(transaction.date)}`}
          className="rounded-chip text-left focus-visible:outline-2 focus-visible:outline-accent"
        >
          {formatDateForDisplay(transaction.date)}
        </button>
      </td>
      <td className={cx('px-5 py-4 align-top font-semibold', isBuy ? 'text-positive' : 'text-negative-fg')}>
        {isBuy ? 'Buy' : 'Sell'}
      </td>
      <td className="px-5 py-4 text-right align-top tabular-nums">{formatQuantity(quantity)}</td>
      <td className="px-5 py-4 text-right align-top tabular-nums">
        {symbol}
        {formatSmartNumber(price)}
      </td>
      <td className="px-5 py-4 text-right align-top font-semibold tabular-nums">
        {symbol}
        {formatSmartNumber(quantity * price)}
      </td>
    </tr>
  );
}
