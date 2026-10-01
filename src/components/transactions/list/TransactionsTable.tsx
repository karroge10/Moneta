'use client';

import type { ReactNode } from 'react';
import type { Category, RecurringRow, Transaction } from '@/types/dashboard';
import type { SortColumn, SortOrder } from '@/hooks/transactions/useTransactionsPage';
import SortableHeader from '@/components/transactions/shared/SortableHeader';
import CategoryIcon from '@/components/transactions/shared/CategoryIcon';
import Skeleton from '@/components/ui/Skeleton';
import { cx } from '@/components/ui/cx';
import { formatMoney } from '@/lib/format';

export type ListRow = Transaction | RecurringRow;

/** Fallback tint for categories without a color (brand purple; category colors are data-driven). */
export const DEFAULT_CATEGORY_COLOR = '#AC66DA';

const MAX_NAME_LENGTH = 60;

const COLUMNS: Array<{ column: SortColumn; label: string }> = [
  { column: 'date', label: 'Date' },
  { column: 'description', label: 'Description' },
  { column: 'type', label: 'Type' },
  { column: 'amount', label: 'Amount' },
  { column: 'category', label: 'Category' },
];

const SKELETON_WIDTHS = ['w-20', 'w-48', 'w-24', 'w-20', 'w-32', 'w-16'];

interface TransactionsTableProps {
  rows: ListRow[];
  categories: Category[];
  currencySymbol: string;
  showStatus: boolean;
  isLoading: boolean;
  skeletonRows: number;
  sortColumn: SortColumn;
  sortOrder: SortOrder;
  onSort: (column: SortColumn) => void;
  onOpen: (row: ListRow) => void;
  /** Rendered in a full-width cell when there are no rows. */
  emptyState: ReactNode;
}

/** Desktop table (lg and up) for past transactions and upcoming recurring items. */
export default function TransactionsTable({
  rows,
  categories,
  currencySymbol,
  showStatus,
  isLoading,
  skeletonRows,
  sortColumn,
  sortOrder,
  onSort,
  onOpen,
  emptyState,
}: TransactionsTableProps) {
  const columnCount = showStatus ? 6 : 5;
  const isEmpty = !isLoading && rows.length === 0;

  return (
    <table className={cx('min-w-full', isEmpty && 'h-full')} aria-busy={isLoading}>
      <thead>
        <tr className="text-left text-caption text-muted">
          {COLUMNS.map(({ column, label }) => (
            <SortableHeader
              key={column}
              column={column}
              label={label}
              sortColumn={sortColumn}
              sortOrder={sortOrder}
              onSort={onSort}
            />
          ))}
          {showStatus && (
            <th scope="col" className="px-5 py-3 align-top uppercase tracking-wide">
              Status
            </th>
          )}
        </tr>
      </thead>
      <tbody>
        {isLoading && <SkeletonRows count={skeletonRows} columnCount={columnCount} />}
        {isEmpty && (
          <tr>
            <td colSpan={columnCount} className="h-full px-5 py-6">
              {emptyState}
            </td>
          </tr>
        )}
        {!isLoading &&
          rows.map((row) => (
            <TransactionRow
              key={row.id}
              row={row}
              category={findCategory(categories, row.category)}
              currencySymbol={currencySymbol}
              showStatus={showStatus}
              onOpen={onOpen}
            />
          ))}
      </tbody>
    </table>
  );
}

/** Expense / Income text label; the word carries the meaning, the color only reinforces it. */
export function TypeLabel({ isExpense }: { isExpense: boolean }) {
  return (
    <span className={cx('text-ui font-semibold', isExpense ? 'text-negative-fg' : 'text-positive')}>
      {isExpense ? 'Expense' : 'Income'}
    </span>
  );
}

/** Active / Paused pill for recurring items. */
export function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={cx(
        'rounded-full px-2 py-1 text-caption font-medium',
        isActive ? 'bg-positive/20 text-positive' : 'bg-surface-3 text-secondary',
      )}
    >
      {isActive ? 'Active' : 'Paused'}
    </span>
  );
}

export function findCategory(categories: Category[], name: string | null): Category | undefined {
  if (!name) return undefined;
  return categories.find((category) => category.name === name);
}

/** Recurring rows carry isActive; plain transactions count as active. */
export function isRowActive(row: ListRow): boolean {
  return row.isActive !== false;
}

interface TransactionRowProps {
  row: ListRow;
  category: Category | undefined;
  currencySymbol: string;
  showStatus: boolean;
  onOpen: (row: ListRow) => void;
}

function TransactionRow({ row, category, currencySymbol, showStatus, onOpen }: TransactionRowProps) {
  const isExpense = row.amount < 0;
  const isLong = row.name.length > MAX_NAME_LENGTH;
  const displayName = isLong ? `${row.name.substring(0, MAX_NAME_LENGTH)}...` : row.name;
  const amount = formatMoney(Math.abs(row.amount), currencySymbol);
  const color = category?.color || DEFAULT_CATEGORY_COLOR;

  return (
    <tr
      className="cursor-pointer border-t border-line-subtle transition-colors hover:bg-surface-2"
      onClick={() => onOpen(row)}
    >
      <td className="px-5 py-4 align-top text-ui tabular-nums">{row.date}</td>
      <td className="px-5 py-4 align-top">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onOpen(row);
          }}
          title={isLong ? row.name : undefined}
          className="text-left text-ui text-fg transition-colors hover:text-accent-fg focus-visible:outline-2 focus-visible:outline-accent cursor-pointer"
        >
          {displayName}
        </button>
      </td>
      <td className="px-5 py-4 align-top">
        <TypeLabel isExpense={isExpense} />
      </td>
      <td className="px-5 py-4 align-top text-ui font-semibold tabular-nums">{amount}</td>
      <td className="px-5 py-4 align-top">
        <div className="flex items-center gap-3">
          {category && (
            <div className="icon-circle size-10" style={{ backgroundColor: `${color}1a` }}>
              <CategoryIcon
                name={category.icon}
                width={20}
                height={20}
                strokeWidth={1.5}
                style={{ color }}
                aria-hidden="true"
              />
            </div>
          )}
          <span className="text-ui">{row.category || 'Uncategorized'}</span>
        </div>
      </td>
      {showStatus && (
        <td className="px-5 py-4 align-top">
          <StatusBadge isActive={isRowActive(row)} />
        </td>
      )}
    </tr>
  );
}

function SkeletonRows({ count, columnCount }: { count: number; columnCount: number }) {
  const widths = SKELETON_WIDTHS.slice(0, columnCount);
  return Array.from({ length: count }, (_, index) => (
    <tr key={`skeleton-${index}`} className="border-t border-line-subtle">
      {widths.map((width) => (
        <td key={width} className="px-5 py-4">
          <Skeleton className={cx('h-4', width)} />
        </td>
      ))}
    </tr>
  ));
}
