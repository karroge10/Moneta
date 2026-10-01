'use client';

import type { ReactNode } from 'react';
import type { Category } from '@/types/dashboard';
import CategoryIcon from '@/components/transactions/shared/CategoryIcon';
import Skeleton from '@/components/ui/Skeleton';
import { cx } from '@/components/ui/cx';
import { formatMoney } from '@/lib/format';
import { DEFAULT_CATEGORY_COLOR, StatusBadge, findCategory, isRowActive, type ListRow } from './TransactionsTable';

interface TransactionCardsProps {
  rows: ListRow[];
  categories: Category[];
  currencySymbol: string;
  showStatus: boolean;
  isLoading: boolean;
  onOpen: (row: ListRow) => void;
  emptyState: ReactNode;
}

/** Mobile list (below lg): one tappable card per transaction or recurring item. */
export default function TransactionCards({
  rows,
  categories,
  currencySymbol,
  showStatus,
  isLoading,
  onOpen,
  emptyState,
}: TransactionCardsProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        {Array.from({ length: 5 }, (_, index) => (
          <CardSkeleton key={`skeleton-card-${index}`} />
        ))}
      </div>
    );
  }

  if (rows.length === 0) return <>{emptyState}</>;

  return (
    <ul className="flex flex-col gap-4">
      {rows.map((row) => (
        <li key={row.id}>
          <TransactionCard
            row={row}
            category={findCategory(categories, row.category)}
            currencySymbol={currencySymbol}
            showStatus={showStatus}
            onOpen={onOpen}
          />
        </li>
      ))}
    </ul>
  );
}

interface TransactionCardProps {
  row: ListRow;
  category: Category | undefined;
  currencySymbol: string;
  showStatus: boolean;
  onOpen: (row: ListRow) => void;
}

function TransactionCard({ row, category, currencySymbol, showStatus, onOpen }: TransactionCardProps) {
  const isExpense = row.amount < 0;
  const amount = formatMoney(Math.abs(row.amount), currencySymbol);
  const iconColor = category?.color || DEFAULT_CATEGORY_COLOR;

  return (
    <button
      type="button"
      onClick={() => onOpen(row)}
      className="w-full rounded-panel border border-line bg-surface-1 p-4 text-left transition-transform active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-accent cursor-pointer"
    >
      <div className="mb-4 flex items-start justify-between">
        <div>
          <div className="mb-0.5 text-caption uppercase tracking-wider text-secondary">Amount</div>
          <div className="text-heading font-bold tabular-nums">{amount}</div>
        </div>
        <span
          className={cx(
            'rounded-full px-3 py-1 text-caption font-bold uppercase tracking-tight',
            isExpense ? 'bg-negative/10 text-negative-fg' : 'bg-positive/10 text-positive',
          )}
        >
          {isExpense ? 'Expense' : 'Income'}
        </span>
      </div>

      <dl className="space-y-3">
        <CardLine label="Description" bordered>
          <span className="block max-w-full truncate text-right">{row.name}</span>
        </CardLine>
        <CardLine label="Date" bordered>
          <span className="tabular-nums">{row.date}</span>
        </CardLine>
        <CardLine label="Category">
          <span className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-full bg-surface-2">
              <CategoryIcon
                name={category?.icon ?? 'HelpCircle'}
                width={14}
                height={14}
                style={{ color: iconColor }}
                aria-hidden="true"
              />
            </span>
            {row.category || 'Uncategorized'}
          </span>
        </CardLine>
        {showStatus && (
          <div className="flex items-center justify-between border-t border-line-subtle pt-2">
            <dt className="text-ui text-secondary">Status</dt>
            <dd>
              <StatusBadge isActive={isRowActive(row)} />
            </dd>
          </div>
        )}
      </dl>
      <span className="mt-4 block w-full rounded-control border border-line-subtle bg-surface-2 py-2.5 text-center text-ui font-semibold text-accent-fg">
        View Details
      </span>
    </button>
  );
}

function CardLine({ label, bordered = false, children }: { label: string; bordered?: boolean; children: ReactNode }) {
  return (
    <div className={cx('flex items-center justify-between gap-4 py-2', bordered && 'border-b border-line-subtle')}>
      <dt className="shrink-0 text-ui text-secondary">{label}</dt>
      <dd className="flex min-w-0 max-w-[60%] justify-end text-ui font-medium">{children}</dd>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="rounded-panel border border-line bg-surface-1 p-4">
      <div className="mb-4 flex justify-between">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-6 w-16" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}
