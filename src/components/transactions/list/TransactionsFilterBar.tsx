'use client';

import type { Category } from '@/types/dashboard';
import SearchBar from '@/components/transactions/shared/SearchBar';
import CategoryFilter from '@/components/transactions/shared/CategoryFilter';
import TypeFilter from '@/components/transactions/shared/TypeFilter';
import MonthFilter from '@/components/transactions/shared/MonthFilter';
import { cx } from '@/components/ui/cx';
import { formatDate } from '@/lib/format';

interface TransactionsFilterBarProps {
  categories: Category[];
  searchQuery: string;
  categoryFilter: string | null;
  typeFilter: string;
  monthFilter: string;
  availableMonths: string[];
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: string | null) => void;
  onTypeChange: (value: string) => void;
  onMonthChange: (value: string) => void;
  disabled?: boolean;
}

/** Search, category, type and month filters above the transactions list. */
export default function TransactionsFilterBar({
  categories,
  searchQuery,
  categoryFilter,
  typeFilter,
  monthFilter,
  availableMonths,
  onSearchChange,
  onCategoryChange,
  onTypeChange,
  onMonthChange,
  disabled = false,
}: TransactionsFilterBarProps) {
  return (
    <div
      className={cx(
        'flex shrink-0 flex-col gap-3 md:flex-row md:items-center',
        disabled && 'pointer-events-none opacity-50',
      )}
    >
      <div className="flex-[0.6]">
        <SearchBar placeholder="Search transactions..." value={searchQuery} onChange={onSearchChange} />
      </div>
      <div className="flex-[0.4]">
        <CategoryFilter categories={categories} selectedCategory={categoryFilter} onSelect={onCategoryChange} />
      </div>
      <div className="w-full md:w-40">
        <TypeFilter value={typeFilter} onChange={onTypeChange} />
      </div>
      <div className="w-full md:w-40">
        <MonthFilter
          value={monthFilter}
          onChange={onMonthChange}
          availableMonths={availableMonths}
          formatMonthLabel={formatMonthLabel}
        />
      </div>
    </div>
  );
}

function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(year, month - 1);
  return formatDate(date, 'monthYear');
}
