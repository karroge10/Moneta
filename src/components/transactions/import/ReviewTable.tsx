'use client';

import { Language, Trash } from 'iconoir-react';
import type { Category, UploadedTransaction } from '@/types/dashboard';
import Tooltip from '@/components/ui/Tooltip';
import Spinner from '@/components/ui/Spinner';
import { cx } from '@/components/ui/cx';
import CategoryPicker from '@/components/transactions/shared/CategoryPicker';
import ReviewDatePicker from '@/components/transactions/shared/ReviewDatePicker';
import SortableHeader from '@/components/transactions/shared/SortableHeader';
import { TypeLabel } from '@/components/transactions/list/TransactionsTable';
import type { ReviewRow } from '@/hooks/transactions/useImportFlow';
import type { ReviewSortColumn, ReviewSortOrder } from '@/hooks/transactions/useImportReview';

interface ReviewTableProps {
  rows: ReviewRow[];
  categories: Category[];
  currencySymbol: string;
  isLoading: boolean;
  sortColumn: ReviewSortColumn;
  sortOrder: ReviewSortOrder;
  onSort: (column: ReviewSortColumn) => void;
  onUpdate: (id: string, key: keyof UploadedTransaction, value: string) => void;
  onDelete: (id: string) => void;
}

const COLUMNS: Array<{ column: ReviewSortColumn; label: string; className: string }> = [
  { column: 'date', label: 'Date', className: 'w-32' },
  { column: 'description', label: 'Description', className: 'w-[40%]' },
  { column: 'amount', label: 'Amount', className: 'w-32' },
  { column: 'category', label: 'Category', className: 'w-48' },
];

const cellInputClass =
  'w-full rounded-control border border-line bg-surface-1 px-3 py-2 text-base text-fg sm:text-ui focus-visible:border-accent focus-visible:outline-none';

/** Editable table of parsed statement rows: date, description, amount, category, delete. */
export default function ReviewTable({
  rows,
  categories,
  currencySymbol,
  isLoading,
  sortColumn,
  sortOrder,
  onSort,
  onUpdate,
  onDelete,
}: ReviewTableProps) {
  return (
    <div
      className="relative w-full flex-1 overflow-auto rounded-card border border-line bg-surface-0"
      aria-busy={isLoading}
    >
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface-inset/85 backdrop-blur-[2px]">
          <Spinner size={40} />
        </div>
      )}
      <table className="w-full min-w-[720px] table-fixed">
        <thead>
          <tr className="text-left text-caption text-muted">
            {COLUMNS.map(({ column, label, className }) => (
              <SortableHeader
                key={column}
                column={column}
                label={label}
                sortColumn={sortColumn}
                sortOrder={sortOrder}
                onSort={onSort}
                className={className}
              />
            ))}
            <th scope="col" className="w-16 px-5 py-3">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-5 py-6 text-center text-ui text-secondary">
                Select a recent import to preview its transactions.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <ReviewRowItem
                key={row.id}
                row={row}
                categories={categories}
                currencySymbol={currencySymbol}
                onUpdate={onUpdate}
                onDelete={onDelete}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

interface ReviewRowItemProps {
  row: ReviewRow;
  categories: Category[];
  currencySymbol: string;
  onUpdate: ReviewTableProps['onUpdate'];
  onDelete: ReviewTableProps['onDelete'];
}

function ReviewRowItem({ row, categories, currencySymbol, onUpdate, onDelete }: ReviewRowItemProps) {
  const translation = row.translatedDescription || 'No translation';
  const amountValue = Number.isFinite(row.amount) ? Math.abs(row.amount).toFixed(2) : '';

  return (
    <tr className="border-t border-line-subtle">
      <td className="px-5 py-4 align-top">
        <ReviewDatePicker value={row.date} onChange={(value) => onUpdate(row.id, 'date', value)} />
      </td>
      <td className="max-w-0 px-5 py-4 align-top">
        <div className="max-w-full space-y-1.5">
          <input
            type="text"
            value={row.description}
            onChange={(event) => onUpdate(row.id, 'description', event.target.value)}
            className={cx(cellInputClass, 'truncate')}
            placeholder="Description"
            aria-label="Description"
            title={row.description}
          />
          <div className="flex min-w-0 items-center gap-1.5 text-caption text-secondary">
            <Language width={14} height={14} strokeWidth={1.5} className="shrink-0" aria-hidden="true" />
            <Tooltip content={translation}>
              <span className="truncate">{translation}</span>
            </Tooltip>
          </div>
        </div>
      </td>
      <td className="px-5 py-4 align-top">
        <div className="space-y-1.5">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ui text-secondary">
              {currencySymbol}
            </span>
            <input
              type="text"
              inputMode="decimal"
              pattern="^-?\d*(?:[\.,]\d{0,2})?$"
              value={amountValue}
              onChange={(event) => onUpdate(row.id, 'amount', event.target.value)}
              aria-label="Amount"
              className={cx(cellInputClass, 'pl-8 tabular-nums')}
            />
          </div>
          <TypeLabel isExpense={row.amount < 0} />
        </div>
      </td>
      <td className="overflow-visible px-5 py-4 align-top">
        <CategoryPicker
          categories={categories}
          selectedCategory={row.category ?? null}
          onSelect={(category) => onUpdate(row.id, 'category', category ?? '')}
          suggestedCategory={row.suggestedCategory ?? null}
        />
      </td>
      <td className="px-5 py-4 align-top">
        <button
          type="button"
          onClick={() => onDelete(row.id)}
          aria-label="Delete transaction"
          title="Delete transaction"
          className="inline-flex size-10 items-center justify-center rounded-full bg-surface-0 text-negative-fg transition-colors hover:bg-negative/10 focus-visible:outline-2 focus-visible:outline-accent cursor-pointer"
        >
          <Trash width={16} height={16} strokeWidth={1.5} aria-hidden="true" />
        </button>
      </td>
    </tr>
  );
}
