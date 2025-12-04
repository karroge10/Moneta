'use client';

import { useState, useEffect, useCallback } from 'react';
import { NotificationEntry } from '@/types/dashboard';

export function useNotifications(limit: number = 10, unreadOnly: boolean = false) {
  const [notifications, setNotifications] = useState<NotificationEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(`/api/notifications?limit=${limit}&unreadOnly=${unreadOnly}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }
      
      const data = await response.json();
      setNotifications(data.notifications || []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch notifications');
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  }, [limit, unreadOnly]);

  useEffect(() => {
    fetchNotifications();
    
    // Refresh notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    
    // Listen for custom event to refresh notifications immediately
    const handleRefreshEvent = () => {
      fetchNotifications();
    };
    window.addEventListener('refreshNotifications', handleRefreshEvent);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('refreshNotifications', handleRefreshEvent);
    };
  }, [fetchNotifications]);

  return {
    notifications,
    isLoading,
    error,
    refresh: fetchNotifications,
  };
}
