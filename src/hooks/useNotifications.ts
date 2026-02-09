'use client';

import { useMemo } from 'react';
import { useNotificationContext } from '@/contexts/NotificationContext';

export function useNotifications(limit: number = 10, unreadOnly: boolean = false) {
  const { notifications: allNotifications, isLoading, error, refresh } = useNotificationContext();

  // Filter and limit notifications based on hook parameters
  const notifications = useMemo(() => {
    let filtered = allNotifications;
    if (unreadOnly) {
      filtered = allNotifications.filter(n => !n.read);
    }
    return filtered.slice(0, limit);
  }, [allNotifications, limit, unreadOnly]);

  return {
    notifications,
    isLoading,
    error,
    refresh,
  };
}
