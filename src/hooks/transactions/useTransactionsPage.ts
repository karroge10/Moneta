'use client';

import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { Category, RecurringItem, RecurringRow, Transaction } from '@/types/dashboard';
import { apiFetch } from '@/lib/api-client';
import { API, queryKeys, type QueryFilters } from '@/lib/query-keys';
import { formatDateForDisplay } from '@/lib/dateFormatting';
import { useAuthReadyForApi } from '@/hooks/useAuthReadyForApi';
import { useDebouncedValue } from '@/hooks/transactions/useDebouncedValue';

export type SortColumn = 'date' | 'description' | 'type' | 'amount' | 'category';
export type SortOrder = 'asc' | 'desc';
export type ViewMode = 'past' | 'future';

const DEFAULT_PAGE_SIZE = 10;

export interface TransactionsListResponse {
  transactions: Transaction[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  /** Rows left out of totals because no exchange rate was found. */
  missingRates?: number;
}

export interface RecurringListResponse {
  items: RecurringItem[];
  missingRates?: number;
}

/** Filters, sorting, paging and both list queries for the transactions page. */
export function useTransactionsPage(viewMode: ViewMode, categories: Category[]) {
  const authReady = useAuthReadyForApi();
  const [searchQuery, setSearchQueryState] = useState('');
  const [categoryFilter, setCategoryFilterState] = useState<string | null>(null);
  const [typeFilter, setTypeFilterState] = useState('');
  const [monthFilter, setMonthFilterState] = useState('');
  const [sortColumn, setSortColumn] = useState<SortColumn>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(DEFAULT_PAGE_SIZE);
  const debouncedSearch = useDebouncedValue(searchQuery, 300);

  const filters: QueryFilters = {
    page: currentPage,
    pageSize,
    sortBy: sortColumn,
    sortOrder,
    search: debouncedSearch,
    category: categoryFilter,
    type: typeFilter,
    ...monthParams(monthFilter),
  };

  const transactionsQuery = useQuery({
    queryKey: queryKeys.transactions.list(filters),
    queryFn: () => apiFetch<TransactionsListResponse>(API.transactions, { params: filters }),
    enabled: authReady && viewMode === 'past',
    placeholderData: keepPreviousData,
  });

  const recurringQuery = useQuery({
    queryKey: queryKeys.recurring.list(),
    queryFn: () => apiFetch<RecurringListResponse>(API.recurring),
    enabled: authReady && viewMode === 'future',
  });

  const availableMonths = useSeenMonths(transactionsQuery.data?.transactions);

  const recurringItems = recurringQuery.data?.items ?? [];
  const recurringRows = buildRecurringRows(recurringItems, categories, {
    search: debouncedSearch,
    categoryFilter,
    typeFilter,
    monthFilter,
    sortColumn,
    sortOrder,
  });

  const isPast = viewMode === 'past';
  const activeQuery = isPast ? transactionsQuery : recurringQuery;
  const pastData = transactionsQuery.data;
  const recurringTotalPages = Math.max(1, Math.ceil(recurringRows.length / pageSize));
  const pageStart = (currentPage - 1) * pageSize;
  const recurringPageRows = recurringRows.slice(pageStart, pageStart + pageSize);

  const resetPage = () => setCurrentPage(1);

  return {
    filters: {
      searchQuery,
      categoryFilter,
      typeFilter,
      monthFilter,
      availableMonths,
      setSearchQuery: withPageReset(setSearchQueryState, resetPage),
      setCategoryFilter: withPageReset(setCategoryFilterState, resetPage),
      setTypeFilter: withPageReset(setTypeFilterState, resetPage),
      setMonthFilter: withPageReset(setMonthFilterState, resetPage),
    },
    sort: {
      sortColumn,
      sortOrder,
      toggleSort: (column: SortColumn) => {
        if (sortColumn === column) {
          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
          setSortColumn(column);
          setSortOrder(column === 'date' || column === 'amount' ? 'desc' : 'asc');
        }
        resetPage();
      },
    },
    paging: {
      currentPage,
      pageSize,
      totalPages: isPast ? Math.max(1, pastData?.totalPages ?? 0) : recurringTotalPages,
      setPage: setCurrentPage,
      setPageSize: (size: number) => {
        setPageSizeState(size);
        resetPage();
      },
      resetPage,
    },
    transactions: pastData?.transactions ?? [],
    recurringItems,
    recurringRows: recurringPageRows,
    shownCount: isPast ? (pastData?.transactions.length ?? 0) : recurringPageRows.length,
    total: isPast ? (pastData?.total ?? 0) : recurringRows.length,
    missingRates: activeQuery.data?.missingRates ?? 0,
    isLoading: activeQuery.isPending,
    isFetching: activeQuery.isFetching,
    error: activeQuery.error,
    refetch: activeQuery.refetch,
  };
}

/** Month keys (YYYY-MM) of every transaction page seen so far, newest first. */
function useSeenMonths(transactions: Transaction[] | undefined): string[] {
  const [source, setSource] = useState<Transaction[] | undefined>(undefined);
  const [months, setMonths] = useState<string[]>([]);
  if (transactions && transactions !== source) {
    setSource(transactions);
    setMonths(mergeMonths(months, transactions));
  }
  return months;
}

function mergeMonths(previous: string[], transactions: Transaction[]): string[] {
  const months = new Set(previous);
  for (const transaction of transactions) {
    const date = new Date(transaction.dateRaw || transaction.date);
    if (Number.isNaN(date.getTime())) continue;
    const month = String(date.getMonth() + 1).padStart(2, '0');
    months.add(`${date.getFullYear()}-${month}`);
  }
  return Array.from(months).sort().reverse();
}

function withPageReset<T>(setter: (value: T) => void, resetPage: () => void) {
  return (value: T) => {
    setter(value);
    resetPage();
  };
}

function monthParams(monthFilter: string): QueryFilters {
  if (monthFilter === 'this_month') return { timePeriod: 'This Month' };
  if (monthFilter === 'this_year') return { timePeriod: 'This Year' };
  if (monthFilter) return { timePeriod: 'All Time', month: monthFilter };
  return { timePeriod: 'All Time' };
}

interface RecurringRowOptions {
  search: string;
  categoryFilter: string | null;
  typeFilter: string;
  monthFilter: string;
  sortColumn: SortColumn;
  sortOrder: SortOrder;
}

function buildRecurringRows(items: RecurringItem[], categories: Category[], options: RecurringRowOptions): RecurringRow[] {
  const filtered = items.filter((item) => matchesRecurringFilters(item, options));
  const rows = filtered.map((item) => toRecurringRow(item, categories));
  return rows.sort((a, b) => compareRecurringRows(a, b, options.sortColumn, options.sortOrder));
}

function matchesRecurringFilters(item: RecurringItem, options: RecurringRowOptions): boolean {
  const query = options.search.toLowerCase().trim();
  if (query && !item.name.toLowerCase().includes(query)) return false;
  if (options.categoryFilter && item.category !== options.categoryFilter) return false;
  if (options.typeFilter && item.type !== options.typeFilter) return false;
  if (!options.monthFilter) return true;

  const due = item.nextDueDate.slice(0, 7);
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, '0');
  if (options.monthFilter === 'this_month') return due === `${year}-${month}`;
  if (options.monthFilter === 'this_year') return due.slice(0, 4) === year;
  return due === options.monthFilter;
}

function toRecurringRow(item: RecurringItem, categories: Category[]): RecurringRow {
  const value = item.convertedAmount ?? item.amount;
  const category = categories.find((c) => c.name === item.category);
  return {
    id: `recurring-${item.id}`,
    name: item.name,
    date: formatDateForDisplay(item.nextDueDate),
    dateRaw: item.nextDueDate.slice(0, 10),
    amount: item.type === 'expense' ? -value : value,
    category: item.category,
    icon: category?.icon ?? 'HelpCircle',
    isRecurring: true,
    recurringId: item.id,
    isActive: item.isActive,
  };
}

function compareRecurringRows(a: RecurringRow, b: RecurringRow, column: SortColumn, order: SortOrder): number {
  const direction = order === 'asc' ? 1 : -1;
  if (column === 'amount') return (a.amount - b.amount) * direction;
  const key = column === 'description' ? 'name' : column === 'date' ? 'dateRaw' : column;
  const aValue = String(a[key as keyof RecurringRow]);
  const bValue = String(b[key as keyof RecurringRow]);
  return aValue.localeCompare(bValue) * direction;
}
