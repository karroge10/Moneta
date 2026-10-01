'use client';

import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { NavArrowLeft, NavArrowRight } from 'iconoir-react';
import DashboardHeader from '@/components/DashboardHeader';
import MobileNavbar from '@/components/MobileNavbar';
import NotificationsTable from '@/components/notifications/NotificationsTable';
import Card from '@/components/ui/Card';
import ErrorState from '@/components/ui/ErrorState';
import { inputClass } from '@/components/ui/Field';
import { cx } from '@/components/ui/cx';
import type { NotificationEntry } from '@/types/dashboard';
import { useAuthReadyForApi } from '@/hooks/useAuthReadyForApi';
import { apiFetch } from '@/lib/api-client';
import { API, queryKeys } from '@/lib/query-keys';

interface NotificationsResponse {
  notifications: NotificationEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export default function NotificationsPage() {
  const authReady = useAuthReadyForApi();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  // null while the input mirrors the current page; a string while the user is typing.
  const [pageDraft, setPageDraft] = useState<string | null>(null);
  const filters = { page: currentPage, pageSize };

  const query = useQuery({
    queryKey: queryKeys.notifications.list(filters),
    queryFn: () => apiFetch<NotificationsResponse>(API.notifications, { params: filters }),
    enabled: authReady,
    placeholderData: keepPreviousData,
  });

  const total = query.data?.total ?? 0;
  const totalPages = query.data?.totalPages ?? 0;
  const isBusy = query.isFetching;

  const handlePageChange = (newPage: number) => {
    setPageDraft(null);
    if (newPage >= 1 && (totalPages === 0 || newPage <= totalPages)) setCurrentPage(newPage);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  const commitPageDraft = () => {
    const page = Number.parseInt(pageDraft ?? '', 10);
    if (Number.isNaN(page)) {
      setPageDraft(null);
      return;
    }
    handlePageChange(page);
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="hidden md:block">
        <DashboardHeader pageName="Notifications" />
      </div>

      <div className="md:hidden">
        <MobileNavbar pageName="Notifications" activeSection="notifications" />
      </div>

      <div className="flex h-[calc(100vh-120px)] min-h-0 flex-col px-4 pb-6 md:px-6 lg:px-8">
        <div className="flex min-h-0 flex-1 flex-col">
          <Card
            title="Notification History"
            showActions={false}
            action={
              <span className="text-ui tabular-nums text-muted">
                {total.toLocaleString('en-US')} {total === 1 ? 'item' : 'items'}
              </span>
            }
            className="flex min-h-0 w-full flex-1 flex-col"
          >
            {query.isError ? (
              <ErrorState
                title="Could not load notifications"
                onRetry={() => query.refetch()}
                retrying={query.isFetching}
              />
            ) : (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="min-h-0 flex-1">
                  <NotificationsTable notifications={query.data?.notifications ?? []} isLoading={query.isPending} />
                </div>

                <div className="mt-6 flex shrink-0 flex-col items-center justify-between gap-4 md:flex-row">
                  <div>
                    <label htmlFor="notifications-page-size" className="sr-only">
                      Notifications per page
                    </label>
                    <select
                      id="notifications-page-size"
                      value={pageSize}
                      onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                      className={cx(inputClass, 'w-auto')}
                    >
                      {PAGE_SIZE_OPTIONS.map((size) => (
                        <option key={size} value={size}>
                          {size} per page
                        </option>
                      ))}
                    </select>
                  </div>

                  <nav aria-label="Pagination" className="flex items-center gap-2 text-pagination">
                    <button
                      type="button"
                      disabled={currentPage === 1 || isBusy}
                      onClick={() => handlePageChange(currentPage - 1)}
                      className={PAGE_BUTTON_CLASS}
                      aria-label="Previous page"
                    >
                      <NavArrowLeft width={20} height={20} strokeWidth={1.5} aria-hidden="true" />
                    </button>

                    <div className="flex items-center gap-2 px-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={pageDraft ?? String(currentPage)}
                        onChange={(e) => setPageDraft(e.target.value)}
                        onBlur={() => setPageDraft(null)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitPageDraft();
                        }}
                        className={cx(inputClass, 'w-14 text-center tabular-nums')}
                        aria-label="Current page"
                      />
                      <span className="text-ui tabular-nums text-muted">of {totalPages || 1}</span>
                    </div>

                    <button
                      type="button"
                      disabled={currentPage === totalPages || totalPages === 0 || isBusy}
                      onClick={() => handlePageChange(currentPage + 1)}
                      className={PAGE_BUTTON_CLASS}
                      aria-label="Next page"
                    >
                      <NavArrowRight width={20} height={20} strokeWidth={1.5} aria-hidden="true" />
                    </button>
                  </nav>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </main>
  );
}

const PAGE_BUTTON_CLASS =
  'inline-flex size-10 items-center justify-center rounded-control border border-line bg-surface-0 transition-colors hover:border-accent/50 disabled:cursor-not-allowed disabled:opacity-30';
