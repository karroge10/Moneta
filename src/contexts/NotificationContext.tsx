'use client';

import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import type { NotificationEntry } from '@/types/dashboard';
import { apiFetch } from '@/lib/api-client';
import { API, queryKeys } from '@/lib/query-keys';
import { useAuthReadyForApi } from '@/hooks/useAuthReadyForApi';

interface NotificationContextType {
  notifications: NotificationEntry[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  /** Marks one notification (or all when id is omitted) as read, optimistically, and saves it. */
  markAsRead: (id?: string) => void;
}

interface NotificationsPage {
  notifications: NotificationEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const POLL_INTERVAL_MS = 60 * 1000;
const RECENT_FILTERS = { pageSize: 50 } as const;

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

/**
 * Recent notifications for the header bell, polled every minute while the tab is visible.
 * Other code can refresh it with `queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all })`
 * or the legacy `refreshNotifications` window event.
 */
export function NotificationProvider({ children }: { children: ReactNode }) {
  const authReady = useAuthReadyForApi();
  const queryClient = useQueryClient();
  const recentKey = queryKeys.notifications.list(RECENT_FILTERS);

  const query = useQuery({
    queryKey: recentKey,
    queryFn: () => apiFetch<NotificationsPage>(API.notifications, { params: RECENT_FILTERS }),
    select: (data) => data.notifications ?? [],
    enabled: authReady,
    refetchInterval: POLL_INTERVAL_MS,
  });

  const markMutation = useMutation({
    mutationFn: (id?: string) => markReadRequest(id),
    onMutate: (id) => markReadInCache(queryClient, id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all }),
  });

  useEffect(() => {
    const handleRefreshEvent = () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    };
    window.addEventListener('refreshNotifications', handleRefreshEvent);
    return () => window.removeEventListener('refreshNotifications', handleRefreshEvent);
  }, [queryClient]);

  const refresh = async () => {
    await query.refetch();
  };

  const value: NotificationContextType = {
    notifications: authReady ? (query.data ?? []) : [],
    isLoading: authReady && query.isPending,
    error: query.error ? query.error.message : null,
    refresh,
    markAsRead: markMutation.mutate,
  };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotificationContext() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }
  return context;
}

function markReadRequest(id?: string): Promise<unknown> {
  const url = id ? API.notificationRead(id) : API.notifications;
  return apiFetch(url, { method: 'PATCH' });
}

/** Flips `read` in every cached notifications page so the UI updates before the server answers. */
function markReadInCache(queryClient: QueryClient, id?: string) {
  queryClient.setQueriesData<NotificationsPage>({ queryKey: queryKeys.notifications.all }, (page) => {
    if (!page?.notifications) return page;
    const notifications = page.notifications.map((n) => (!id || n.id === id ? { ...n, read: true } : n));
    return { ...page, notifications };
  });
}
