'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardHeader from '@/components/DashboardHeader';
import MobileNavbar from '@/components/MobileNavbar';
import TransactionModal from '@/components/transactions/TransactionModal';
import CategoryStatsModal from '@/components/transactions/CategoryStatsModal';
import SearchBar from '@/components/transactions/shared/SearchBar';
import CategoryFilter from '@/components/transactions/shared/CategoryFilter';
import TypeFilter from '@/components/transactions/shared/TypeFilter';
import MonthFilter from '@/components/transactions/shared/MonthFilter';
import Card from '@/components/ui/Card';
import { Transaction, Category, RecurringItem, RecurringRow } from '@/types/dashboard';
import { Upload, Reports, NavArrowUp, NavArrowDown } from 'iconoir-react';
import { getIcon } from '@/lib/iconMapping';
import { formatNumber } from '@/lib/utils';
import { formatDateForDisplay } from '@/lib/dateFormatting';
import { buildTransactionFromRecurring } from '@/lib/recurring-utils';
import { useCurrency } from '@/hooks/useCurrency';

const DEFAULT_PAGE_SIZE = 10;
const MAX_NAME_LENGTH = 60;

function truncateName(name: string, maxLength: number): string {
  if (name.length <= maxLength) return name;
  return name.substring(0, maxLength) + '...';
}

type ViewMode = 'past' | 'future';

export default function TransactionsPage() {
  const { currency } = useCurrency();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const view = searchParams.get('view');
    if (view === 'future') return 'future';
    return 'past';
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currencyOptions, setCurrencyOptions] = useState<Array<{ id: number; name: string; symbol: string; alias: string }>>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('edit');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [pageInput, setPageInput] = useState('1');
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>(''); // 'expense' | 'income' | ''
  const [monthFilter, setMonthFilter] = useState<string>(''); // 'this_month' | 'this_year' | month string | ''
  
  // Sorting
  type SortColumn = 'date' | 'description' | 'type' | 'amount' | 'category';
  type SortOrder = 'asc' | 'desc';
  const [sortColumn, setSortColumn] = useState<SortColumn>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  
  // Modals
  const [isCategoryStatsOpen, setIsCategoryStatsOpen] = useState(false);

  // Per-page dropdown
  const [isPerPageOpen, setIsPerPageOpen] = useState(false);
  const perPageRef = useRef<HTMLDivElement>(null);

  // Future (recurring) view
  const [recurringItems, setRecurringItems] = useState<RecurringItem[]>([]);
  const [recurringLoading, setRecurringLoading] = useState(false);

  // Sync viewMode from URL on mount / when searchParams change (e.g. back/forward or View All link)
  useEffect(() => {
    const view = searchParams.get('view');
    setViewMode(view === 'future' ? 'future' : 'past');
  }, [searchParams]);

  // Close per-page dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (perPageRef.current && !perPageRef.current.contains(e.target as Node)) {
        setIsPerPageOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const setViewModeAndUrl = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    setCurrentPage(1);
    setPageInput('1');
    if (mode === 'past') {
      setSelectedTransaction(null);
    }
    if (mode === 'future') {
      router.replace('/transactions?view=future', { scroll: false });
    } else {
      router.replace('/transactions', { scroll: false });
    }
  }, [router]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300); // 300ms debounce delay

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch transactions with filters
  const fetchTransactions = useCallback(async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        timePeriod: 'All Time', // Always use All Time, filter by month/time period instead
        sortBy: sortColumn,
        sortOrder: sortOrder,
      });
      
      if (debouncedSearchQuery) params.set('search', debouncedSearchQuery);
      if (categoryFilter) params.set('category', categoryFilter);
      if (typeFilter) params.set('type', typeFilter);
      
      // Handle time period filters
      if (monthFilter) {
        if (monthFilter === 'this_month' || monthFilter === 'this_year') {
          // Convert to timePeriod format
          const periodMap: Record<string, string> = {
            'this_month': 'This Month',
            'this_year': 'This Year',
          };
          params.set('timePeriod', periodMap[monthFilter]);
        } else {
          // It's a specific month
          params.set('month', monthFilter);
        }
      }
      
      setPageInput(page.toString());
      
      const response = await fetch(`/api/transactions?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }
      
      const data = await response.json();
      setTransactions(data.transactions || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 0);
      setCurrentPage(data.page || 1);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearchQuery, categoryFilter, typeFilter, monthFilter, pageSize, sortColumn, sortOrder]);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/categories');
        if (response.ok) {
          const data = await response.json();
          setCategories(data.categories || []);
        }
      } catch (err) {
        console.error('Error fetching categories:', err);
      }
    };
    fetchCategories();
  }, []);

  // Fetch currencies
  useEffect(() => {
    const fetchCurrencies = async () => {
      try {
        const response = await fetch('/api/currencies');
        if (response.ok) {
          const data = await response.json();
          setCurrencyOptions(data.currencies || []);
        }
      } catch (err) {
        console.error('Error fetching currencies:', err);
      }
    };
    fetchCurrencies();
  }, []);

  // Fetch recurring items for future view
  const fetchRecurring = useCallback(async () => {
    try {
      setRecurringLoading(true);
      setError(null);
      const response = await fetch('/api/recurring');
      if (!response.ok) throw new Error('Failed to fetch recurring items');
      const data = await response.json();
      setRecurringItems(data.items || []);
    } catch (err) {
      console.error('Error fetching recurring:', err);
      setError(err instanceof Error ? err.message : 'Failed to load recurring items');
      setRecurringItems([]);
    } finally {
      setRecurringLoading(false);
    }
  }, []);

  // Fetch transactions when filters, page size, or page change (past view only)
  useEffect(() => {
    if (viewMode === 'past') {
      fetchTransactions(1);
    }
  }, [viewMode, fetchTransactions]);

  // Fetch recurring when switching to future view
  useEffect(() => {
    if (viewMode === 'future') {
      fetchRecurring();
    }
  }, [viewMode, fetchRecurring]);

  // Get available months - fetch from API
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  
  useEffect(() => {
    const fetchAvailableMonths = async () => {
      try {
        // Fetch a sample to get months (first page should have recent transactions)
        const params = new URLSearchParams({
          page: '1',
          pageSize: '100',
          timePeriod: 'All Time',
        });
        const response = await fetch(`/api/transactions?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          const months = new Set<string>();
          data.transactions.forEach((t: Transaction) => {
            // Use dateRaw if available, otherwise parse the formatted date
            const dateStr = t.dateRaw || t.date;
            if (dateStr) {
              const date = new Date(dateStr);
              if (!isNaN(date.getTime())) {
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                months.add(monthKey);
              }
            }
          });
          setAvailableMonths(Array.from(months).sort().reverse());
        }
      } catch (err) {
        console.error('Error fetching available months:', err);
      }
    };
    fetchAvailableMonths();
  }, []);

  const createDraftTransaction = () => ({
    id: crypto.randomUUID(),
    name: '',
    date: '',
    amount: 0,
    category: null,
    icon: 'HelpCircle',
  });

  const handleTransactionClick = (transaction: Transaction) => {
    setModalMode('edit');
    setSelectedTransaction(transaction);
  };

  const buildTxFromRecurring = useCallback(
    (item: RecurringItem) => buildTransactionFromRecurring(item, categories),
    [categories]
  );

  const handleRecurringRowClick = (row: RecurringRow) => {
    const item = recurringItems.find((i) => i.id === row.recurringId);
    if (item) {
      setModalMode('edit');
      setSelectedTransaction(buildTxFromRecurring(item));
    }
  };

  const handlePauseResume = async (recurringId: number, isActive: boolean) => {
    const item = recurringItems.find((i) => i.id === recurringId);
    if (!item) return;
    try {
      setError(null);
      setIsSaving(true);
      const response = await fetch('/api/recurring', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          name: item.name,
          amount: item.amount,
          type: item.type,
          category: item.category ?? null,
          startDate: item.startDate,
          endDate: item.endDate ?? null,
          frequencyUnit: item.frequencyUnit,
          frequencyInterval: item.frequencyInterval,
          isActive,
        }),
      });
      if (!response.ok) throw new Error('Failed to update');
      setRecurringItems((prev) =>
        prev.map((i) => (i.id === recurringId ? { ...i, isActive } : i))
      );
      setSelectedTransaction((prev) =>
        prev && prev.recurringId === recurringId
          ? { ...prev, recurring: prev.recurring ? { ...prev.recurring, isActive } : { isRecurring: true, isActive, frequencyUnit: 'month', frequencyInterval: 1, startDate: '' } }
          : prev
      );
    } catch (err) {
      console.error('Error pausing/resuming recurring:', err);
      setError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddTransactionClick = () => {
    setModalMode('add');
    setSelectedTransaction(createDraftTransaction());
  };

  const handleImportClick = () => {
    router.push('/transactions/import');
  };

  const handleSave = async (updatedTransaction: Transaction) => {
    try {
      setError(null);
      setIsSaving(true);

      if (updatedTransaction.recurringId !== undefined) {
        const rec = updatedTransaction.recurring;
        if (!rec) throw new Error('Missing recurring data');
        const response = await fetch('/api/recurring', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: updatedTransaction.recurringId,
            name: updatedTransaction.name,
            amount: Math.abs(updatedTransaction.amount),
            type: updatedTransaction.amount < 0 ? 'expense' : 'income',
            startDate: rec.startDate,
            endDate: rec.endDate ?? null,
            frequencyUnit: rec.frequencyUnit,
            frequencyInterval: rec.frequencyInterval,
            isActive: rec.isActive ?? true,
            currencyId: updatedTransaction.currencyId,
            category: updatedTransaction.category,
          }),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to save recurring');
        }
        setSelectedTransaction(null);
        fetchRecurring();
        return;
      }

      const isNew = modalMode === 'add';
      let response: Response;
      if (isNew) {
        response = await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedTransaction),
        });
      } else {
        response = await fetch('/api/transactions', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedTransaction),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save transaction');
      }

      const data = await response.json();
      const savedTransaction = data.transaction;

      setTransactions(prev => {
        const exists = prev.some(t => t.id === savedTransaction.id);
        if (exists) {
          return prev.map(t => (t.id === savedTransaction.id ? savedTransaction : t));
        }
        return [savedTransaction, ...prev];
      });

      setSelectedTransaction(null);
      fetchTransactions(currentPage);
    } catch (err) {
      console.error('Error saving transaction:', err);
      setError(err instanceof Error ? err.message : 'Failed to save transaction');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCloseModal = () => {
    setSelectedTransaction(null);
  };

  const handleDelete = async () => {
    if (!selectedTransaction) return;

    try {
      if (selectedTransaction.recurringId !== undefined) {
        const response = await fetch(`/api/recurring?id=${selectedTransaction.recurringId}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to delete recurring');
        }
        setSelectedTransaction(null);
        fetchRecurring();
        return;
      }

      const response = await fetch(`/api/transactions?id=${selectedTransaction.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete transaction');
      }

      setSelectedTransaction(null);
      fetchTransactions(currentPage);
    } catch (err) {
      console.error('Error deleting transaction:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete transaction');
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      fetchTransactions(newPage);
    }
  };

  const handlePageInputChange = (value: string) => {
    setPageInput(value);
  };

  const handlePageInputSubmit = () => {
    const page = parseInt(pageInput, 10);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      handlePageChange(page);
    } else {
      setPageInput(currentPage.toString());
    }
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  const formatMonthLabel = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // Toggle order if same column
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to desc for date/amount, asc for text columns
      setSortColumn(column);
      setSortOrder(column === 'date' || column === 'amount' ? 'desc' : 'asc');
    }
    setCurrentPage(1);
  };

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) {
      return null;
    }
    return sortOrder === 'asc' ? (
      <NavArrowUp width={14} height={14} strokeWidth={2} />
    ) : (
      <NavArrowDown width={14} height={14} strokeWidth={2} />
    );
  };

  // Map and filter recurring items for future view; sort and paginate
  const recurringRowsData = useMemo(() => {
    if (viewMode !== 'future') return { rows: [] as RecurringRow[], total: 0, totalPages: 0 };
    const q = debouncedSearchQuery.toLowerCase().trim();
    let filtered = recurringItems.filter((item) => {
      if (q && !item.name.toLowerCase().includes(q)) return false;
      if (categoryFilter && item.category !== categoryFilter) return false;
      if (typeFilter && item.type !== typeFilter) return false;
      if (monthFilter) {
        const due = item.nextDueDate.slice(0, 7);
        if (monthFilter === 'this_month' || monthFilter === 'this_year') {
          const now = new Date();
          const y = now.getFullYear();
          const m = String(now.getMonth() + 1).padStart(2, '0');
          if (monthFilter === 'this_month' && due !== `${y}-${m}`) return false;
          if (monthFilter === 'this_year' && due.slice(0, 4) !== String(y)) return false;
        } else if (due !== monthFilter) return false;
      }
      return true;
    });
    const mapped: RecurringRow[] = filtered.map((item) => {
      const amount = item.type === 'expense' ? -(item.convertedAmount ?? item.amount) : (item.convertedAmount ?? item.amount);
      const categoryObj = categories.find((c) => c.name === item.category);
      return {
        id: `recurring-${item.id}`,
        name: item.name,
        date: formatDateForDisplay(item.nextDueDate),
        dateRaw: item.nextDueDate.slice(0, 10),
        amount,
        category: item.category,
        icon: categoryObj?.icon ?? 'HelpCircle',
        isRecurring: true as const,
        recurringId: item.id,
        isActive: item.isActive,
      };
    });
    const sortKey = sortColumn === 'description' ? 'name' : sortColumn === 'date' ? 'dateRaw' : sortColumn;
    mapped.sort((a, b) => {
      const aVal = a[sortKey as keyof RecurringRow];
      const bVal = b[sortKey as keyof RecurringRow];
      if (sortColumn === 'date' || sortColumn === 'dateRaw') {
        const cmp = String(aVal).localeCompare(String(bVal));
        return sortOrder === 'asc' ? cmp : -cmp;
      }
      if (sortColumn === 'amount') {
        const cmp = (a.amount as number) - (b.amount as number);
        return sortOrder === 'asc' ? cmp : -cmp;
      }
      const cmp = String(aVal).localeCompare(String(bVal));
      return sortOrder === 'asc' ? cmp : -cmp;
    });
    const total = mapped.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const start = (currentPage - 1) * pageSize;
    const rows = mapped.slice(start, start + pageSize);
    return { rows, total, totalPages };
  }, [
    viewMode,
    recurringItems,
    debouncedSearchQuery,
    categoryFilter,
    typeFilter,
    monthFilter,
    categories,
    sortColumn,
    sortOrder,
    currentPage,
    pageSize,
  ]);

  const displayLoading = viewMode === 'past' ? loading : recurringLoading;
  const displayTotal = viewMode === 'past' ? total : recurringRowsData.total;
  const displayTotalPages = viewMode === 'past' ? totalPages : recurringRowsData.totalPages;

  return (
    <main className="min-h-screen bg-[#202020]">
      {/* Desktop Header */}
      <div className="hidden md:block">
        <DashboardHeader 
          pageName="Transactions"
          actionButtons={[
            {
              label: 'Add Transaction',
              onClick: handleAddTransactionClick,
            },
            {
              label: 'Import',
              onClick: handleImportClick,
              icon: <Upload width={18} height={18} strokeWidth={1.5} />,
            },
            {
              label: 'Category Stats',
              onClick: () => setIsCategoryStatsOpen(true),
              icon: <Reports width={18} height={18} strokeWidth={1.5} />,
            },
          ]}
        />
      </div>

      {/* Mobile Navbar */}
      <div className="md:hidden">
        <MobileNavbar 
          pageName="Transactions" 
          activeSection="transactions"
        />
      </div>

      {/* Content */}
      <div className="px-4 md:px-6 lg:px-8 pb-6 flex flex-col min-h-[calc(100vh-120px)]">
        <Card
          title="History"
          onAdd={handleAddTransactionClick}
          className="flex-1 flex flex-col"
          customHeader={
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-card-header">History</h2>
              <div className="flex rounded-full p-1 border border-[#3a3a3a]" style={{ backgroundColor: '#202020' }}>
                <button
                  type="button"
                  onClick={() => setViewModeAndUrl('past')}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors cursor-pointer ${
                    viewMode === 'past' ? 'bg-[#AC66DA] text-[#E7E4E4]' : 'text-[#E7E4E4] hover:opacity-80'
                  }`}
                >
                  Past
                </button>
                <button
                  type="button"
                  onClick={() => setViewModeAndUrl('future')}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors cursor-pointer ${
                    viewMode === 'future' ? 'bg-[#AC66DA] text-[#E7E4E4]' : 'text-[#E7E4E4] hover:opacity-80'
                  }`}
                >
                  Future
                </button>
              </div>
            </div>
          }
        >
          <div className="flex flex-col gap-4 flex-1 min-h-0">
            {/* Filters */}
            <div className={`flex flex-col md:flex-row md:items-center gap-3 shrink-0 ${displayLoading ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="flex-[0.6]">
                <SearchBar
                  placeholder="Search transactions..."
                  value={searchQuery}
                  onChange={setSearchQuery}
                />
              </div>
              <div className="flex-[0.4]">
                <CategoryFilter
                  categories={categories}
                  selectedCategory={categoryFilter}
                  onSelect={setCategoryFilter}
                />
              </div>
              <div className="w-full md:w-40">
                <TypeFilter
                  value={typeFilter}
                  onChange={setTypeFilter}
                />
              </div>
              <div className="w-full md:w-40">
                <MonthFilter
                  value={monthFilter}
                  onChange={setMonthFilter}
                  availableMonths={availableMonths}
                  formatMonthLabel={formatMonthLabel}
                />
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="text-sm shrink-0" style={{ color: '#D93F3F' }}>
                {error}
              </div>
            )}

            {/* Table */}
            <div className="flex-1 flex flex-col min-h-0 rounded-3xl border border-[#3a3a3a] overflow-hidden" style={{ backgroundColor: '#202020', minHeight: (viewMode === 'past' ? transactions.length === 0 : recurringRowsData.rows.length === 0) && !displayLoading ? 'calc(100vh - 400px)' : 'auto' }}>
              <div className="flex-1 overflow-x-auto">
                <table className="min-w-full" style={{ height: (viewMode === 'past' ? transactions.length === 0 : recurringRowsData.rows.length === 0) && !displayLoading ? '100%' : 'auto' }}>
                      <thead>
                        <tr className="text-left text-xs uppercase tracking-wide" style={{ color: '#9CA3AF' }}>
                          <th 
                            className="px-5 py-3 align-top cursor-pointer hover:text-[#E7E4E4] transition-colors select-none"
                            onClick={() => handleSort('date')}
                          >
                            <span className="flex items-center gap-1">
                              Date
                              <SortIcon column="date" />
                            </span>
                          </th>
                          <th 
                            className="px-5 py-3 align-top cursor-pointer hover:text-[#E7E4E4] transition-colors select-none"
                            onClick={() => handleSort('description')}
                          >
                            <span className="flex items-center gap-1">
                              Description
                              <SortIcon column="description" />
                            </span>
                          </th>
                          <th 
                            className="px-5 py-3 align-top cursor-pointer hover:text-[#E7E4E4] transition-colors select-none"
                            onClick={() => handleSort('type')}
                          >
                            <span className="flex items-center gap-1">
                              Type
                              <SortIcon column="type" />
                            </span>
                          </th>
                          <th 
                            className="px-5 py-3 align-top cursor-pointer hover:text-[#E7E4E4] transition-colors select-none"
                            onClick={() => handleSort('amount')}
                          >
                            <span className="flex items-center gap-1">
                              Amount
                              <SortIcon column="amount" />
                            </span>
                          </th>
                          <th 
                            className="px-5 py-3 align-top cursor-pointer hover:text-[#E7E4E4] transition-colors select-none"
                            onClick={() => handleSort('category')}
                          >
                            <span className="flex items-center gap-1">
                              Category
                              <SortIcon column="category" />
                            </span>
                          </th>
                          {viewMode === 'future' && (
                            <th className="px-5 py-3 align-top" style={{ color: '#9CA3AF' }}>
                              Status
                            </th>
                          )}
                        </tr>
                      </thead>
                  <tbody>
                    {displayLoading ? (
                      <>
                        {/* Loading skeleton rows */}
                        {Array.from({ length: pageSize }).map((_, index) => (
                          <tr key={`skeleton-${index}`} className="border-t border-[#2A2A2A]">
                            <td className="px-5 py-4">
                              <div className="h-4 w-20 rounded animate-pulse" style={{ backgroundColor: '#3a3a3a' }}></div>
                            </td>
                            <td className="px-5 py-4">
                              <div className="h-4 w-48 rounded animate-pulse" style={{ backgroundColor: '#3a3a3a' }}></div>
                            </td>
                            <td className="px-5 py-4">
                              <div className="h-4 w-24 rounded animate-pulse" style={{ backgroundColor: '#3a3a3a' }}></div>
                            </td>
                            <td className="px-5 py-4">
                              <div className="h-4 w-20 rounded animate-pulse" style={{ backgroundColor: '#3a3a3a' }}></div>
                            </td>
                            <td className="px-5 py-4">
                              <div className="h-4 w-32 rounded animate-pulse" style={{ backgroundColor: '#3a3a3a' }}></div>
                            </td>
                            {viewMode === 'future' && (
                              <td className="px-5 py-4">
                                <div className="h-4 w-16 rounded animate-pulse" style={{ backgroundColor: '#3a3a3a' }}></div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </>
                    ) : viewMode === 'past' && transactions.length === 0 ? (
                      <tr>
                        <td colSpan={viewMode === 'future' ? 6 : 5} className="px-5 py-6 text-center text-sm" style={{ color: 'var(--text-secondary)', height: '100%' }}>
                          <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 500px)' }}>
                            No transactions found. Try adjusting your filters.
                          </div>
                        </td>
                      </tr>
                    ) : viewMode === 'future' && recurringRowsData.rows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-6 text-center text-sm" style={{ color: 'var(--text-secondary)', height: '100%' }}>
                          <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 500px)' }}>
                            No upcoming recurring transactions.
                          </div>
                        </td>
                      </tr>
                    ) : viewMode === 'past' ? (
                      transactions.map(transaction => {
                        const isExpense = transaction.amount < 0;
                        const absoluteAmount = Math.abs(transaction.amount);
                        const truncatedName = truncateName(transaction.name, MAX_NAME_LENGTH);
                        const categoryObj = categories.find(c => c.name === transaction.category);
                        const CategoryIcon = categoryObj ? getIcon(categoryObj.icon) : null;
                        
                        return (
                          <tr
                            key={transaction.id}
                            className="border-t border-[#2A2A2A] cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => handleTransactionClick(transaction)}
                          >
                            <td className="px-5 py-4 align-top">
                              <span className="text-sm">{transaction.date}</span>
                            </td>
                            <td className="px-5 py-4 align-top">
                              <div className="text-sm" title={transaction.name.length > MAX_NAME_LENGTH ? transaction.name : undefined}>
                                {truncatedName}
                              </div>
                            </td>
                            <td className="px-5 py-4 align-top">
                              <span className="text-sm font-semibold" style={{ color: isExpense ? '#D93F3F' : '#74C648' }}>
                                {isExpense ? 'Expense' : 'Income'}
                              </span>
                            </td>
                            <td className="px-5 py-4 align-top">
                              <span className="text-sm font-semibold">
                                {currency.symbol}{formatNumber(absoluteAmount)}
                              </span>
                            </td>
                            <td className="px-5 py-4 align-top">
                              <div className="flex items-center gap-2">
                                {CategoryIcon && (
                                  <CategoryIcon width={16} height={16} strokeWidth={1.5} style={{ color: categoryObj?.color || '#E7E4E4' }} />
                                )}
                                <span className="text-sm">{transaction.category || 'Uncategorized'}</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      recurringRowsData.rows.map(row => {
                        const isExpense = row.amount < 0;
                        const absoluteAmount = Math.abs(row.amount);
                        const truncatedName = truncateName(row.name, MAX_NAME_LENGTH);
                        const categoryObj = categories.find(c => c.name === row.category);
                        const CategoryIcon = categoryObj ? getIcon(categoryObj.icon) : null;
                        return (
                          <tr
                            key={row.id}
                            className="border-t border-[#2A2A2A] cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => handleRecurringRowClick(row)}
                          >
                            <td className="px-5 py-4 align-top">
                              <span className="text-sm">{row.date}</span>
                            </td>
                            <td className="px-5 py-4 align-top">
                              <div className="text-sm" title={row.name.length > MAX_NAME_LENGTH ? row.name : undefined}>
                                {truncatedName}
                              </div>
                            </td>
                            <td className="px-5 py-4 align-top">
                              <span className="text-sm font-semibold" style={{ color: isExpense ? '#D93F3F' : '#74C648' }}>
                                {isExpense ? 'Expense' : 'Income'}
                              </span>
                            </td>
                            <td className="px-5 py-4 align-top">
                              <span className="text-sm font-semibold">
                                {currency.symbol}{formatNumber(absoluteAmount)}
                              </span>
                            </td>
                            <td className="px-5 py-4 align-top">
                              <div className="flex items-center gap-2">
                                {CategoryIcon && (
                                  <CategoryIcon width={16} height={16} strokeWidth={1.5} style={{ color: categoryObj?.color || '#E7E4E4' }} />
                                )}
                                <span className="text-sm">{row.category || 'Uncategorized'}</span>
                              </div>
                            </td>
                            <td className="px-5 py-4 align-top">
                              <span
                                className="text-xs font-medium px-2 py-1 rounded-full"
                                style={{
                                  backgroundColor: row.isActive ? 'rgba(116, 198, 72, 0.2)' : 'rgba(60, 60, 60, 0.6)',
                                  color: row.isActive ? '#74C648' : 'rgba(231, 228, 228, 0.7)',
                                }}
                              >
                                {row.isActive ? 'Active' : 'Paused'}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2 shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-xs" style={{ color: 'rgba(231, 228, 228, 0.7)' }}>
                  Showing {viewMode === 'past' ? transactions.length : recurringRowsData.rows.length} of {displayTotal} {viewMode === 'past' ? 'transactions' : 'recurring'}
                </span>
                <div className="relative" ref={perPageRef}>
                  <button
                    type="button"
                    onClick={() => setIsPerPageOpen(o => !o)}
                    className="flex items-center rounded-full py-1 pl-2 pr-4 text-xs font-semibold transition-colors cursor-pointer hover:opacity-90"
                    style={{ backgroundColor: '#282828', color: 'var(--text-primary)' }}
                  >
                    <span>{pageSize} per page</span>
                    <span className="ml-2 shrink-0">
                      <NavArrowDown width={14} height={14} strokeWidth={2} />
                    </span>
                  </button>
                  {isPerPageOpen && (
                    <div
                      className="absolute bottom-full left-0 mb-2 rounded-2xl shadow-lg overflow-hidden z-10 min-w-[120px]"
                      style={{ backgroundColor: 'var(--bg-surface)' }}
                    >
                      {[10, 20, 50, 100].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => {
                            handlePageSizeChange(n);
                            setIsPerPageOpen(false);
                          }}
                          className="w-full text-left px-4 py-2.5 text-xs font-medium transition-colors cursor-pointer hover:bg-[#2a2a2a]"
                          style={{
                            color: pageSize === n ? 'var(--accent-purple)' : 'var(--text-primary)',
                          }}
                        >
                          {n} per page
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1 || loading}
                  className="px-3 py-1 rounded-full text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer hover:opacity-90"
                  style={{ backgroundColor: '#202020', color: 'var(--text-primary)' }}
                >
                  Prev
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: 'var(--text-primary)' }}>
                    Page
                  </span>
                  <input
                    type="number"
                    min="1"
                    max={totalPages || 1}
                    value={pageInput}
                    onChange={e => handlePageInputChange(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        handlePageInputSubmit();
                      }
                    }}
                    onBlur={handlePageInputSubmit}
                    className="w-16 rounded-full border-none px-3 py-1 text-xs font-semibold text-center"
                    style={{ backgroundColor: '#202020', color: 'var(--text-primary)' }}
                  />
                  <span className="text-xs" style={{ color: 'var(--text-primary)' }}>
                    of {totalPages || 1}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handlePageChange(Math.min(totalPages || 1, currentPage + 1))}
                  disabled={currentPage >= (totalPages || 1) || loading}
                  className="px-3 py-1 rounded-full text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer hover:opacity-90"
                  style={{ backgroundColor: '#202020', color: 'var(--text-primary)' }}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Transaction Modal (past transactions and future recurring - same form, Pause for recurring) */}
      {selectedTransaction && (
        <TransactionModal
          transaction={selectedTransaction}
          mode={modalMode}
          onClose={handleCloseModal}
          onSave={handleSave}
          onDelete={handleDelete}
          onPauseResume={selectedTransaction.recurringId !== undefined ? handlePauseResume : undefined}
          isSaving={isSaving}
          categories={categories}
          currencyOptions={currencyOptions}
        />
      )}

      {/* Category Stats Modal */}
      {isCategoryStatsOpen && (
        <CategoryStatsModal
          categories={categories}
          timePeriod="All Time"
          onClose={() => setIsCategoryStatsOpen(false)}
        />
      )}
    </main>
  );
}
