'use client';

import { useState } from 'react';
import { Reports } from 'iconoir-react';
import DashboardHeader from '@/components/DashboardHeader';
import MobileNavbar from '@/components/MobileNavbar';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { ToastContainer } from '@/components/ui/Toast';
import SearchBar from '@/components/transactions/shared/SearchBar';
import CategoryFilter from '@/components/transactions/shared/CategoryFilter';
import TypeFilter from '@/components/transactions/shared/TypeFilter';
import Pagination from '@/components/transactions/shared/Pagination';
import CategoryStatsModal from '@/components/transactions/CategoryStatsModal';
import RecentJobsList from '@/components/transactions/import/RecentJobsList';
import CurrencySelector from '@/components/transactions/import/CurrencySelector';
import UploadDropZone from '@/components/transactions/import/UploadDropZone';
import ReviewTable from '@/components/transactions/import/ReviewTable';
import type { Category, Transaction } from '@/types/dashboard';
import { useToasts } from '@/hooks/transactions/useToasts';
import { useImportFlow, type ReviewRow } from '@/hooks/transactions/useImportFlow';
import { selectReviewPage, useImportReviewState } from '@/hooks/transactions/useImportReview';
import { formatDecimal } from '@/lib/format';

export default function ImportTransactionsPage() {
  const { toasts, addToast, removeToast } = useToasts();
  const review = useImportReviewState();
  const flow = useImportFlow({ addToast, onRowsReplaced: review.resetSort, onCleared: review.resetAll });
  const [isCategoryStatsOpen, setIsCategoryStatsOpen] = useState(false);

  const visible = selectReviewPage(flow.rows, review);
  const hasRows = flow.rows.length > 0;

  return (
    <main className="min-h-screen bg-background">
      <div className="hidden md:block">
        <DashboardHeader pageName="Import Transactions" />
      </div>
      <div className="md:hidden">
        <MobileNavbar pageName="Import Transactions" activeSection="transactions" />
      </div>

      <div className="min-h-[calc(100vh-120px)] px-4 pb-6 md:px-6 lg:px-8">
        <div className="flex min-h-full flex-col gap-6">
          <div className="grid items-stretch gap-6 xl:grid-cols-[minmax(0,0.62fr)_minmax(320px,0.38fr)]">
            <Card title="Bank Statement Upload" showActions={false} className="flex h-full w-full flex-col">
              <div className="flex w-full flex-1 flex-col gap-4">
                <UploadDropZone
                  uploadState={flow.uploadState}
                  isBusy={flow.isBusy}
                  progressValue={flow.progressValue}
                  statusNote={flow.statusNote}
                  startTime={flow.startTime}
                  elapsedSeconds={flow.elapsedSeconds}
                  processedCount={flow.processedCount}
                  totalCount={flow.totalCount}
                  onFile={flow.uploadFile}
                />
              </div>
            </Card>

            <Card title="Recent Imports" showActions={false} className="flex h-full max-h-[420px] w-full flex-col">
              <RecentJobsList
                onResumeJob={flow.resumeJob}
                currentJobId={flow.currentJobId}
                className="mt-2 flex-1 overflow-y-auto pb-6 pr-2"
                onDeleteActiveJob={flow.clearActiveJob}
                onError={(message) => addToast(message, 'error')}
              />
            </Card>
          </div>

          <Card title="Review Transactions" showActions={false} className="flex flex-1 flex-col">
            <div className="flex flex-1 flex-col gap-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="min-w-0 flex-[0.6]">
                  <SearchBar placeholder="Search transactions..." value={review.searchQuery} onChange={review.setSearchQuery} />
                </div>
                <div className="flex-[0.4]">
                  <CategoryFilter
                    categories={flow.categories}
                    selectedCategory={review.categoryFilter}
                    onSelect={review.setCategoryFilter}
                  />
                </div>
                <div className="w-full md:w-40">
                  <TypeFilter value={review.typeFilter} onChange={review.setTypeFilter} />
                </div>
                <div className="w-full lg:ml-auto lg:w-auto">
                  <Button
                    variant="secondary"
                    onClick={() => setIsCategoryStatsOpen(true)}
                    disabled={!hasRows}
                    icon={<Reports width={18} height={18} strokeWidth={1.5} aria-hidden="true" />}
                  >
                    Category Breakdown
                  </Button>
                </div>
              </div>

              <ReviewTable
                rows={visible.pageRows}
                categories={flow.categories}
                currencySymbol={flow.reviewCurrencySymbol}
                isLoading={flow.isReviewLoading || flow.isConfirming}
                sortColumn={review.sortColumn}
                sortOrder={review.sortOrder}
                onSort={review.toggleSort}
                onUpdate={flow.updateRow}
                onDelete={flow.deleteRow}
              />

              <div className="flex flex-col justify-between gap-4 pt-2 lg:flex-row lg:items-center">
                <p className="text-caption text-secondary tabular-nums">
                  {hasRows &&
                    `Showing ${formatDecimal(visible.pageRows.length)} of ${formatDecimal(visible.filteredCount)} transactions`}
                </p>
                {visible.totalPages > 1 && visible.filteredCount > 0 && (
                  <Pagination page={visible.page} totalPages={visible.totalPages} onPageChange={review.setPage} />
                )}
              </div>

              <div className="mt-6 flex flex-col items-stretch justify-end gap-3 sm:flex-row sm:items-center">
                <div className="sm:w-72">
                  <CurrencySelector
                    options={flow.currencyOptions}
                    selectedCurrencyId={flow.selectedCurrencyId}
                    onSelect={flow.selectCurrency}
                    disabled={flow.isConfirming}
                  />
                </div>
                <Button
                  onClick={flow.confirmImport}
                  loading={flow.isConfirming}
                  disabled={!hasRows || !flow.selectedCurrencyId}
                >
                  Confirm Import
                </Button>
                {flow.currencyError && (
                  <p role="alert" className="text-caption text-negative-fg">
                    {flow.currencyError}
                  </p>
                )}
              </div>
            </div>
          </Card>

          {isCategoryStatsOpen && hasRows && (
            <CategoryStatsModal
              categories={flow.categories}
              transactions={toPreviewTransactions(flow.rows, flow.categories)}
              timePeriod="Import Preview"
              onClose={() => setIsCategoryStatsOpen(false)}
            />
          )}
        </div>

        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </div>
    </main>
  );
}

/** Review rows in the shape CategoryStatsModal expects. */
function toPreviewTransactions(rows: ReviewRow[], categories: Category[]): Transaction[] {
  const iconEntries = categories.map((category): [string, string] => [category.name, category.icon]);
  const iconByName = new Map(iconEntries);
  return rows.map((row) => ({
    id: row.id,
    name: row.description,
    date: row.date,
    amount: row.amount,
    category: row.category,
    icon: (row.category && iconByName.get(row.category)) || 'HelpCircle',
  }));
}
