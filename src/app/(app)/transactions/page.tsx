'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Upload, Reports } from 'iconoir-react';
import DashboardHeader from '@/components/DashboardHeader';
import MobileNavbar from '@/components/MobileNavbar';
import TransactionModal from '@/components/transactions/TransactionModal';
import CategoryStatsModal from '@/components/transactions/CategoryStatsModal';
import TransactionsFilterBar from '@/components/transactions/list/TransactionsFilterBar';
import TransactionsTable, { type ListRow } from '@/components/transactions/list/TransactionsTable';
import TransactionCards from '@/components/transactions/list/TransactionCards';
import TransactionsFooter from '@/components/transactions/list/TransactionsFooter';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import { ToastContainer } from '@/components/ui/Toast';
import { cx } from '@/components/ui/cx';
import type { RecurringItem, Transaction } from '@/types/dashboard';
import { buildTransactionFromRecurring } from '@/lib/recurring-utils';
import { useCurrency } from '@/hooks/useCurrency';
import { useCategories } from '@/hooks/useCategories';
import { useCurrencyOptions } from '@/hooks/useCurrencyOptions';
import { useToasts } from '@/hooks/transactions/useToasts';
import { useTransactionsPage, type ViewMode } from '@/hooks/transactions/useTransactionsPage';
import {
  useDeleteRecurring,
  useDeleteTransaction,
  useSaveRecurring,
  useSaveTransaction,
  useToggleRecurring,
} from '@/hooks/transactions/useTransactionMutations';

export default function TransactionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const viewMode: ViewMode = searchParams.get('view') === 'future' ? 'future' : 'past';
  const isPast = viewMode === 'past';

  const { currency } = useCurrency();
  const { categories } = useCategories();
  const { currencyOptions, loading: currencyOptionsLoading } = useCurrencyOptions();
  const { toasts, addToast, removeToast } = useToasts();
  const list = useTransactionsPage(viewMode, categories);

  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('edit');
  const [isCategoryStatsOpen, setIsCategoryStatsOpen] = useState(false);

  const saveTransaction = useSaveTransaction();
  const deleteTransaction = useDeleteTransaction();
  const saveRecurring = useSaveRecurring();
  const deleteRecurring = useDeleteRecurring();
  const toggleRecurring = useToggleRecurring();
  const isSaving = saveTransaction.isPending || saveRecurring.isPending || toggleRecurring.isPending;
  const isDeleting = deleteTransaction.isPending || deleteRecurring.isPending;

  const setViewMode = (mode: ViewMode) => {
    list.paging.resetPage();
    if (mode === 'past') setSelectedTransaction(null);
    const url = mode === 'future' ? '/transactions?view=future' : '/transactions';
    router.replace(url, { scroll: false });
  };

  const openAddModal = () => {
    const draft = createDraftTransaction();
    setModalMode('add');
    setSelectedTransaction(draft);
  };

  const openRow = (row: ListRow) => {
    setModalMode('edit');
    if (isPast || row.recurringId === undefined) {
      setSelectedTransaction(row as Transaction);
      return;
    }
    const item = findRecurringItem(list.recurringItems, row.recurringId);
    if (!item) return;
    const transaction = buildTransactionFromRecurring(item, categories);
    setSelectedTransaction(transaction);
  };

  const handleSave = async (updated: Transaction) => {
    try {
      if (updated.recurringId !== undefined) {
        await saveRecurring.mutateAsync(updated);
        setSelectedTransaction(null);
        addToast('Recurring item saved');
        return;
      }
      const result = await saveTransaction.mutateAsync({ transaction: updated, isNew: modalMode === 'add' });
      setSelectedTransaction(null);
      const message = result.transaction
        ? 'Transaction saved'
        : 'Recurring transaction created. Transaction will be created when start date arrives.';
      addToast(message);
    } catch (error) {
      const message = errorMessage(error, 'Failed to save transaction');
      addToast(message, 'error');
    }
  };

  const handleDelete = async () => {
    if (!selectedTransaction) return;
    try {
      if (selectedTransaction.recurringId !== undefined) {
        await deleteRecurring.mutateAsync(selectedTransaction.recurringId);
        addToast('Recurring item deleted');
      } else {
        await deleteTransaction.mutateAsync(selectedTransaction.id);
        addToast('Transaction deleted');
      }
      setSelectedTransaction(null);
    } catch (error) {
      const message = errorMessage(error, 'Failed to delete transaction');
      addToast(message, 'error');
    }
  };

  const handlePauseResume = async (recurringId: number, isActive: boolean) => {
    const item = findRecurringItem(list.recurringItems, recurringId);
    if (!item) return;
    try {
      await toggleRecurring.mutateAsync({ item, isActive });
      setSelectedTransaction((prev) => withRecurringActive(prev, recurringId, isActive));
      addToast(isActive ? 'Recurring item resumed' : 'Recurring item paused');
    } catch (error) {
      const message = errorMessage(error, 'Failed to update');
      addToast(message, 'error');
    }
  };

  const rows: ListRow[] = isPast ? list.transactions : list.recurringRows;
  const title = isPast ? 'History' : 'Upcoming';
  const emptyState = isPast ? (
    <EmptyState title="No transactions found" description="Try adjusting your filters." className="h-full" />
  ) : (
    <EmptyState title="No upcoming recurring transactions" className="h-full" />
  );
  const listError = list.error ? (
    <ErrorState
      message={errorMessage(list.error, 'Failed to load transactions')}
      onRetry={() => list.refetch()}
      retrying={list.isFetching}
    />
  ) : null;

  return (
    <main className="min-h-screen bg-background">
      <div className="hidden md:block">
        <DashboardHeader
          pageName="Transactions"
          actionButtons={[
            { label: 'Add Transaction', onClick: openAddModal },
            {
              label: 'Import',
              onClick: () => router.push('/transactions/import'),
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
      <div className="md:hidden">
        <MobileNavbar pageName="Transactions" activeSection="transactions" />
      </div>

      <div className="flex min-h-[calc(100vh-120px)] flex-col px-4 pb-6 md:px-6">
        <Card
          title={title}
          onAdd={openAddModal}
          className="flex flex-1 flex-col"
          customHeader={
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-card-header">{title}</h2>
              <ViewModeToggle value={viewMode} onChange={setViewMode} />
            </div>
          }
        >
          <div className="flex min-h-0 flex-1 flex-col gap-4">
            <TransactionsFilterBar
              categories={categories}
              searchQuery={list.filters.searchQuery}
              categoryFilter={list.filters.categoryFilter}
              typeFilter={list.filters.typeFilter}
              monthFilter={list.filters.monthFilter}
              availableMonths={list.filters.availableMonths}
              onSearchChange={list.filters.setSearchQuery}
              onCategoryChange={list.filters.setCategoryFilter}
              onTypeChange={list.filters.setTypeFilter}
              onMonthChange={list.filters.setMonthFilter}
              disabled={list.isLoading}
            />

            <div
              className={cx(
                'flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden rounded-card border border-line bg-surface-0',
                rows.length === 0 && !list.isLoading && 'min-h-[calc(100vh-400px)]',
              )}
            >
              {listError ?? (
                <>
                  <div className="hidden flex-1 overflow-auto lg:block">
                    <TransactionsTable
                      rows={rows}
                      categories={categories}
                      currencySymbol={currency.symbol}
                      showStatus={!isPast}
                      isLoading={list.isLoading}
                      skeletonRows={list.paging.pageSize}
                      sortColumn={list.sort.sortColumn}
                      sortOrder={list.sort.sortOrder}
                      onSort={list.sort.toggleSort}
                      onOpen={openRow}
                      emptyState={emptyState}
                    />
                  </div>
                  <div className="flex flex-1 flex-col overflow-auto p-4 lg:hidden">
                    <TransactionCards
                      rows={rows}
                      categories={categories}
                      currencySymbol={currency.symbol}
                      showStatus={!isPast}
                      isLoading={list.isLoading}
                      onOpen={openRow}
                      emptyState={emptyState}
                    />
                  </div>
                </>
              )}
            </div>

            <TransactionsFooter
              shownCount={list.shownCount}
              total={list.total}
              noun={isPast ? 'transactions' : 'recurring'}
              missingRates={list.missingRates}
              page={list.paging.currentPage}
              totalPages={list.paging.totalPages}
              pageSize={list.paging.pageSize}
              onPageChange={list.paging.setPage}
              onPageSizeChange={list.paging.setPageSize}
              disabled={list.isFetching}
            />
          </div>
        </Card>
      </div>

      {selectedTransaction && (
        <TransactionModal
          transaction={selectedTransaction}
          mode={modalMode}
          onClose={() => setSelectedTransaction(null)}
          onSave={handleSave}
          onDelete={handleDelete}
          onPauseResume={selectedTransaction.recurringId !== undefined ? handlePauseResume : undefined}
          isSaving={isSaving}
          isDeleting={isDeleting}
          categories={categories}
          currencyOptions={currencyOptions}
          currencyOptionsLoading={currencyOptionsLoading}
        />
      )}

      {isCategoryStatsOpen && (
        <CategoryStatsModal
          categories={categories}
          timePeriod="All Time"
          onClose={() => setIsCategoryStatsOpen(false)}
        />
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </main>
  );
}

function ViewModeToggle({ value, onChange }: { value: ViewMode; onChange: (mode: ViewMode) => void }) {
  const options: Array<{ mode: ViewMode; label: string }> = [
    { mode: 'past', label: 'Past' },
    { mode: 'future', label: 'Future' },
  ];
  return (
    <div className="flex rounded-full border border-line bg-surface-0 p-1" role="tablist" aria-label="Time range">
      {options.map(({ mode, label }) => (
        <button
          key={mode}
          type="button"
          role="tab"
          aria-selected={value === mode}
          onClick={() => onChange(mode)}
          className={cx(
            'rounded-full px-4 py-2 text-ui font-semibold transition-colors cursor-pointer',
            value === mode ? 'bg-fg text-surface-1' : 'text-fg hover:bg-surface-2',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function createDraftTransaction(): Transaction {
  return {
    id: crypto.randomUUID(),
    name: '',
    date: '',
    amount: 0,
    category: null,
    icon: 'HelpCircle',
  };
}

function findRecurringItem(items: RecurringItem[], recurringId: number): RecurringItem | undefined {
  return items.find((item) => item.id === recurringId);
}

function withRecurringActive(prev: Transaction | null, recurringId: number, isActive: boolean): Transaction | null {
  if (!prev || prev.recurringId !== recurringId) return prev;
  const recurring = prev.recurring
    ? { ...prev.recurring, isActive }
    : { isRecurring: true, isActive, frequencyUnit: 'month' as const, frequencyInterval: 1, startDate: '' };
  return { ...prev, recurring };
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
