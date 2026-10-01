'use client';

import { useState } from 'react';
import { useDebouncedValue } from '@/hooks/transactions/useDebouncedValue';
import type { ReviewRow } from '@/hooks/transactions/useImportFlow';

export type ReviewSortColumn = 'date' | 'description' | 'amount' | 'category';
export type ReviewSortOrder = 'asc' | 'desc';

const REVIEW_PAGE_SIZE = 10;
const UNCATEGORIZED_FILTER = '__uncategorized__';

/** Search, filters, sorting and paging for the import review table. Rows are passed in later. */
export function useImportReviewState() {
  const [searchQuery, setSearchQueryState] = useState('');
  const [categoryFilter, setCategoryFilterState] = useState<string | null>(null);
  const [typeFilter, setTypeFilterState] = useState('');
  const [sortColumn, setSortColumn] = useState<ReviewSortColumn>('date');
  const [sortOrder, setSortOrder] = useState<ReviewSortOrder>('desc');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(searchQuery, 300);

  const resetSort = () => {
    setSortColumn('date');
    setSortOrder('desc');
    setPage(1);
  };

  const resetAll = () => {
    resetSort();
    setSearchQueryState('');
    setCategoryFilterState(null);
    setTypeFilterState('');
  };

  const toggleSort = (column: ReviewSortColumn) => {
    if (sortColumn === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortOrder(column === 'date' || column === 'amount' ? 'desc' : 'asc');
    }
    setPage(1);
  };

  return {
    searchQuery,
    debouncedSearch,
    categoryFilter,
    typeFilter,
    sortColumn,
    sortOrder,
    page,
    setPage,
    setSearchQuery: (value: string) => {
      setSearchQueryState(value);
      setPage(1);
    },
    setCategoryFilter: (value: string | null) => {
      setCategoryFilterState(value);
      setPage(1);
    },
    setTypeFilter: (value: string) => {
      setTypeFilterState(value);
      setPage(1);
    },
    toggleSort,
    resetSort,
    resetAll,
  };
}

export type ImportReviewState = ReturnType<typeof useImportReviewState>;

/** Filtered, sorted rows plus the visible page (clamped when rows are removed). */
export function selectReviewPage(rows: ReviewRow[], state: ImportReviewState) {
  const filtered = rows.filter((row) => matchesReviewFilters(row, state));
  const sorted = filtered.sort((a, b) => compareReviewRows(a, b, state.sortColumn, state.sortOrder));
  const totalPages = Math.max(1, Math.ceil(sorted.length / REVIEW_PAGE_SIZE));
  const page = Math.min(state.page, totalPages);
  const start = (page - 1) * REVIEW_PAGE_SIZE;
  return {
    filteredCount: sorted.length,
    pageRows: sorted.slice(start, start + REVIEW_PAGE_SIZE),
    page,
    totalPages,
  };
}

function matchesReviewFilters(row: ReviewRow, state: ImportReviewState): boolean {
  const query = state.debouncedSearch.toLowerCase();
  const matchesQuery =
    !query ||
    row.description.toLowerCase().includes(query) ||
    row.translatedDescription.toLowerCase().includes(query) ||
    Boolean(row.category?.toLowerCase().includes(query)) ||
    row.date.toLowerCase().includes(query);
  const matchesCategory =
    !state.categoryFilter ||
    (state.categoryFilter === UNCATEGORIZED_FILTER ? row.category === null : row.category === state.categoryFilter);
  const matchesType =
    !state.typeFilter ||
    (state.typeFilter === 'expense' && row.amount < 0) ||
    (state.typeFilter === 'income' && row.amount >= 0);
  return matchesQuery && matchesCategory && matchesType;
}

function compareReviewRows(a: ReviewRow, b: ReviewRow, column: ReviewSortColumn, order: ReviewSortOrder): number {
  const direction = order === 'asc' ? 1 : -1;
  return compareBy(a, b, column) * direction;
}

function compareBy(a: ReviewRow, b: ReviewRow, column: ReviewSortColumn): number {
  if (column === 'date') return new Date(a.date).getTime() - new Date(b.date).getTime();
  if (column === 'amount') return a.amount - b.amount;
  if (column === 'description') return a.description.localeCompare(b.description);
  return (a.category || '').localeCompare(b.category || '');
}
