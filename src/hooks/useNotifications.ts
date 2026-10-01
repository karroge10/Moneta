'use client';

import { useMemo } from 'react';
import { useNotificationContext } from '@/contexts/NotificationContext';

/** Recent notifications from NotificationProvider, optionally unread only, capped at `limit`. */
export function useNotifications(limit: number = 10, unreadOnly: boolean = false) {
  const { notifications: allNotifications, isLoading, error, refresh, markAsRead } = useNotificationContext();

  const notifications = useMemo(() => {
    const filtered = unreadOnly ? allNotifications.filter((n) => !n.read) : allNotifications;
    return filtered.slice(0, limit);
  }, [allNotifications, limit, unreadOnly]);

  return {
    notifications,
    isLoading,
    error,
    refresh,
    markAsRead,
  };
}
