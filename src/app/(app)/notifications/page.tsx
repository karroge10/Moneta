'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import MobileNavbar from '@/components/MobileNavbar';
import NotificationsTable from '@/components/notifications/NotificationsTable';
import Card from '@/components/ui/Card';
import type { NotificationEntry } from '@/types/dashboard';
import { useAuthReadyForApi } from '@/hooks/useAuthReadyForApi';
import { NavArrowLeft, NavArrowRight } from 'iconoir-react';



const DEFAULT_PAGE_SIZE = 10;


export default function NotificationsPage() {
  const authReady = useAuthReadyForApi();

  

  const [notifications, setNotifications] = useState<NotificationEntry[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [pageInput, setPageInput] = useState('1');

  
  const [isPerPageOpen, setIsPerPageOpen] = useState(false);
  const perPageRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async (page: number = 1) => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/notifications?page=${page}&pageSize=${pageSize}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setNotifications(data.notifications || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 0);
      setCurrentPage(data.page || 1);
      setPageInput(data.page?.toString() || '1');
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [pageSize]);

  useEffect(() => {
    if (!authReady) return;
    fetchNotifications(currentPage);
  }, [authReady, currentPage, fetchNotifications]);



  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && (totalPages === 0 || newPage <= totalPages)) {
      setCurrentPage(newPage);
    }
  };


  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="hidden md:block">
        <DashboardHeader pageName="Notifications" />
      </div>

      <div className="md:hidden">
        <MobileNavbar
          pageName="Notifications"
          activeSection="notifications"
        />
      </div>

      <div className="px-4 md:px-6 lg:px-8 pb-6 flex flex-col h-[calc(100vh-120px)] min-h-0">
        <div className="flex flex-col flex-1 min-h-0">
          <Card
            title="Notification History"
            showActions={false}
            customHeader={
              <div className="mb-4 flex items-center justify-between shrink-0">
                <h2 className="text-card-header">Notification History</h2>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-sm text-[#9CA3AF]">
                    <span>{total} items total</span>
                  </div>
                </div>
              </div>
            }
            className="flex-1 flex flex-col min-h-0 w-full"
          >

            <div className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 min-h-0">
                <NotificationsTable
                  notifications={notifications}
                  isLoading={isLoading}
                />
              </div>

              {}
              <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="relative" ref={perPageRef}>
                    <button
                      type="button"
                      onClick={() => setIsPerPageOpen(!isPerPageOpen)}
                      className="px-4 py-2 rounded-xl border border-[#3a3a3a] text-sm flex items-center gap-2 hover:border-[#AC66DA]/50 transition-colors cursor-pointer"
                      style={{ backgroundColor: 'var(--bg-primary)' }}
                    >
                      {pageSize} per page
                    </button>
                    {isPerPageOpen && (
                      <div className="absolute bottom-full mb-2 left-0 w-full rounded-xl border border-[#3a3a3a] shadow-lg overflow-hidden z-20" style={{ backgroundColor: 'var(--bg-surface)' }}>
                        {[10, 20, 50, 100].map((size) => (
                          <button
                            key={size}
                            onClick={() => {
                              handlePageSizeChange(size);
                              setIsPerPageOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-[#AC66DA]/10 hover:text-[#AC66DA] transition-colors text-sm"
                          >
                            {size} per page
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-pagination">
                    <button
                      type="button"
                      disabled={currentPage === 1 || isLoading}
                      onClick={() => handlePageChange(currentPage - 1)}
                      className="p-2 rounded-xl border border-[#3a3a3a] hover:border-[#AC66DA]/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                      style={{ backgroundColor: 'var(--bg-primary)' }}
                      aria-label="Previous page"
                    >
                      <NavArrowLeft width={20} height={20} strokeWidth={1.5} />
                    </button>

                    <div className="flex items-center gap-2 px-2">
                      <input
                        type="text"
                        value={pageInput}
                        onChange={(e) => setPageInput(e.target.value)}
                        onBlur={() => setPageInput(currentPage.toString())}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const p = parseInt(pageInput);
                            if (!isNaN(p)) handlePageChange(p);
                          }
                        }}
                        className="w-12 h-10 rounded-xl border border-[#3a3a3a] bg-transparent text-center text-sm focus:border-[#AC66DA] focus:outline-none transition-all"
                        aria-label="Current page"
                      />
                      <span className="text-sm text-[#9CA3AF]">of {totalPages || 1}</span>
                    </div>

                    <button
                      type="button"
                      disabled={currentPage === totalPages || totalPages === 0 || isLoading}
                      onClick={() => handlePageChange(currentPage + 1)}
                      className="p-2 rounded-xl border border-[#3a3a3a] hover:border-[#AC66DA]/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                      style={{ backgroundColor: 'var(--bg-primary)' }}
                      aria-label="Next page"
                    >
                      <NavArrowRight width={20} height={20} strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}

