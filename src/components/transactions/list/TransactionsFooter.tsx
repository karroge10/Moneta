'use client';

import { useRef, useState } from 'react';
import { NavArrowDown } from 'iconoir-react';
import Pagination from '@/components/transactions/shared/Pagination';
import { cx } from '@/components/ui/cx';
import { formatDecimal } from '@/lib/format';
import { useCloseOnOutsideClick } from '@/hooks/transactions/useCloseOnOutsideClick';

const PAGE_SIZES = [10, 20, 50, 100];

interface TransactionsFooterProps {
  shownCount: number;
  total: number;
  noun: string;
  missingRates: number;
  page: number;
  totalPages: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  disabled?: boolean;
}

/** "Showing X of Y", the per-page menu, the missing-rate note and pagination. */
export default function TransactionsFooter({
  shownCount,
  total,
  noun,
  missingRates,
  page,
  totalPages,
  pageSize,
  onPageChange,
  onPageSizeChange,
  disabled = false,
}: TransactionsFooterProps) {
  return (
    <div className="flex shrink-0 flex-col justify-between gap-4 pt-2 md:flex-row md:items-center">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <span className="text-caption text-secondary tabular-nums">
            Showing {formatDecimal(shownCount)} of {formatDecimal(total)} {noun}
          </span>
          <PageSizeMenu pageSize={pageSize} onChange={onPageSizeChange} />
        </div>
        {missingRates > 0 && <MissingRatesNote count={missingRates} />}
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} disabled={disabled} />
    </div>
  );
}

/** Small note shown when some rows could not be converted to the user's currency. */
export function MissingRatesNote({ count }: { count: number }) {
  const label = count === 1 ? 'transaction' : 'transactions';
  return (
    <p className="text-caption text-muted tabular-nums">
      {formatDecimal(count)} {label} not included: exchange rate unavailable
    </p>
  );
}

function PageSizeMenu({ pageSize, onChange }: { pageSize: number; onChange: (size: number) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useCloseOnOutsideClick(ref, isOpen, () => setIsOpen(false));

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className="flex h-8 items-center rounded-full bg-surface-1 pl-3 pr-3 text-caption font-semibold text-fg transition-colors hover:bg-surface-2 cursor-pointer"
      >
        <span className="tabular-nums">{pageSize} per page</span>
        <NavArrowDown width={14} height={14} strokeWidth={2} className="ml-2 shrink-0" aria-hidden="true" />
      </button>
      {isOpen && (
        <div
          role="listbox"
          aria-label="Rows per page"
          className="absolute bottom-full left-0 z-10 mb-2 min-w-[120px] overflow-hidden rounded-panel bg-surface-1 shadow-lg"
        >
          {PAGE_SIZES.map((size) => (
            <button
              key={size}
              type="button"
              role="option"
              aria-selected={pageSize === size}
              onClick={() => {
                onChange(size);
                setIsOpen(false);
              }}
              className={cx(
                'w-full px-4 py-2.5 text-left text-caption font-medium tabular-nums transition-colors hover:bg-surface-2 cursor-pointer',
                pageSize === size ? 'text-accent-fg' : 'text-fg',
              )}
            >
              {size} per page
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
