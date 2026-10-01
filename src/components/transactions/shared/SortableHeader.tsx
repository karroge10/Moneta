'use client';

import { NavArrowDown, NavArrowUp } from 'iconoir-react';
import { cx } from '@/components/ui/cx';

interface SortableHeaderProps<T extends string> {
  column: T;
  label: string;
  sortColumn: T;
  sortOrder: 'asc' | 'desc';
  onSort: (column: T) => void;
  className?: string;
}

/** Table header cell with a sort button; exposes the current order through aria-sort. */
export default function SortableHeader<T extends string>({
  column,
  label,
  sortColumn,
  sortOrder,
  onSort,
  className,
}: SortableHeaderProps<T>) {
  const isActive = sortColumn === column;
  const ariaSort = isActive ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none';
  const Arrow = sortOrder === 'asc' ? NavArrowUp : NavArrowDown;

  return (
    <th scope="col" aria-sort={ariaSort} className={cx('px-5 py-3 align-top', className)}>
      <button
        type="button"
        onClick={() => onSort(column)}
        className="flex items-center gap-1 uppercase tracking-wide transition-colors hover:text-fg focus-visible:outline-2 focus-visible:outline-accent cursor-pointer"
      >
        {label}
        {isActive && <Arrow width={14} height={14} strokeWidth={2} aria-hidden="true" />}
      </button>
    </th>
  );
}
