'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardHeader from '@/components/DashboardHeader';
import MobileNavbar from '@/components/MobileNavbar';
import TransactionModal from '@/components/transactions/TransactionModal';
import CategoryStatsModal from '@/components/transactions/CategoryStatsModal';
import SearchBar from '@/components/transactions/shared/SearchBar';
import CategoryFilter from '@/components/transactions/shared/CategoryFilter';
import TypeFilter from '@/components/transactions/shared/TypeFilter';
import MonthFilter from '@/components/transactions/shared/MonthFilter';
import Card from '@/components/ui/Card';
import { Transaction, Category } from '@/types/dashboard';
import { Upload, Reports } from 'iconoir-react';
import { getIcon } from '@/lib/iconMapping';
import { formatNumber } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';

const DEFAULT_PAGE_SIZE = 10;
const MAX_NAME_LENGTH = 60;

function truncateName(name: string, maxLength: number): string {
  if (name.length <= maxLength) return name;
  return name.substring(0, maxLength) + '...';
}

export default function TransactionsPage() {
  const { currency } = useCurrency();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
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
  const [monthFilter, setMonthFilter] = useState<string>(''); // 'this_month' | 'this_quarter' | 'this_year' | month string | ''
  
  // Modals
  const [isCategoryStatsOpen, setIsCategoryStatsOpen] = useState(false);

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
      });
      
      if (debouncedSearchQuery) params.set('search', debouncedSearchQuery);
      if (categoryFilter) params.set('category', categoryFilter);
      if (typeFilter) params.set('type', typeFilter);
      
      // Handle time period filters
      if (monthFilter) {
        if (monthFilter === 'this_month' || monthFilter === 'this_quarter' || monthFilter === 'this_year') {
          // Convert to timePeriod format
          const periodMap: Record<string, string> = {
            'this_month': 'This Month',
            'this_quarter': 'This Quarter',
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
  }, [debouncedSearchQuery, categoryFilter, typeFilter, monthFilter, pageSize]);

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

  // Fetch transactions when filters, page size, or page change
  useEffect(() => {
    fetchTransactions(1);
  }, [fetchTransactions]);

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
      
      // Use modalMode to determine if this is a new transaction or edit
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
      fetchTransactions(currentPage); // Refresh current page
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
      const response = await fetch(`/api/transactions?id=${selectedTransaction.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete transaction');
      }
      
      setSelectedTransaction(null);
      fetchTransactions(currentPage); // Refresh current page
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
      <div className="px-4 md:px-6 pb-6 flex flex-col min-h-[calc(100vh-120px)]">
        <Card title="History" onAdd={handleAddTransactionClick} className="flex-1 flex flex-col">
          <div className="flex flex-col gap-4 flex-1 min-h-0">
            {/* Filters */}
            <div className={`flex flex-col md:flex-row md:items-center gap-3 shrink-0 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
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
            <div className="flex-1 flex flex-col min-h-0 rounded-3xl border border-[#3a3a3a] overflow-hidden" style={{ backgroundColor: '#202020', minHeight: transactions.length === 0 && !loading ? 'calc(100vh - 400px)' : 'auto' }}>
              <div className="flex-1 overflow-x-auto">
                <table className="min-w-full" style={{ height: transactions.length === 0 && !loading ? '100%' : 'auto' }}>
                      <thead>
                        <tr className="text-left text-xs uppercase tracking-wide" style={{ color: '#9CA3AF' }}>
                          <th className="px-5 py-3 align-top">Date</th>
                          <th className="px-5 py-3 align-top">Description</th>
                          <th className="px-5 py-3 align-top">Type</th>
                          <th className="px-5 py-3 align-top">Amount</th>
                          <th className="px-5 py-3 align-top">Category</th>
                        </tr>
                      </thead>
                  <tbody>
                    {loading ? (
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
                          </tr>
                        ))}
                      </>
                    ) : transactions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-6 text-center text-sm" style={{ color: 'var(--text-secondary)', height: '100%' }}>
                          <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 500px)' }}>
                            No transactions found. Try adjusting your filters.
                          </div>
                        </td>
                      </tr>
                    ) : (
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
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2 shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Showing {transactions.length} of {total} transactions
                </span>
                <select
                  value={pageSize}
                  onChange={e => handlePageSizeChange(parseInt(e.target.value, 10))}
                  className="rounded-full border-none px-3 py-1 text-xs font-semibold transition-colors cursor-pointer"
                  style={{ backgroundColor: '#202020', color: 'var(--text-primary)' }}
                >
                  <option value="10">10 per page</option>
                  <option value="20">20 per page</option>
                  <option value="50">50 per page</option>
                  <option value="100">100 per page</option>
                </select>
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

      {/* Transaction Modal */}
      {selectedTransaction && (
        <TransactionModal
          transaction={selectedTransaction}
          mode={modalMode}
          onClose={handleCloseModal}
          onSave={handleSave}
          onDelete={handleDelete}
          isSaving={isSaving}
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
