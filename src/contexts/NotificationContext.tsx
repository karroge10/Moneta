'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from '@clerk/nextjs';
import { NotificationEntry } from '@/types/dashboard';

interface NotificationContextType {
    notifications: NotificationEntry[];
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
    markAsReadLocally: (id?: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
    const { isLoaded, isSignedIn } = useAuth();
    const [notifications, setNotifications] = useState<NotificationEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchNotifications = useCallback(async () => {
        if (!isLoaded || !isSignedIn) {
            return;
        }
        // Only fetch if tab is visible to save resources
        if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
            return;
        }

        try {
            setIsLoading(true);
            setError(null);
            const response = await fetch('/api/notifications?limit=50');

            if (response.status === 401) {
                setNotifications([]);
                return;
            }

            if (!response.ok) {
                setError('Failed to fetch notifications');
                setNotifications([]);
                return;
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
    }, [isLoaded, isSignedIn]);

    const markAsReadLocally = useCallback((id?: string) => {
        setNotifications(prev =>
            prev.map(n => {
                if (!id || n.id === id) {
                    return { ...n, read: true };
                }
                return n;
            })
        );
    }, []);

    useEffect(() => {
        if (!isLoaded) {
            return;
        }
        if (!isSignedIn) {
            setNotifications([]);
            setIsLoading(false);
            return;
        }

        fetchNotifications();

        // Refresh notifications every 60 seconds (increased from 30s)
        const interval = setInterval(fetchNotifications, 60000);

        // Listen for custom event to refresh notifications immediately
        const handleRefreshEvent = () => {
            fetchNotifications();
        };

        if (typeof window !== 'undefined') {
            window.addEventListener('refreshNotifications', handleRefreshEvent);
        }

        return () => {
            clearInterval(interval);
            if (typeof window !== 'undefined') {
                window.removeEventListener('refreshNotifications', handleRefreshEvent);
            }
        };
    }, [isLoaded, isSignedIn, fetchNotifications]);

    return (
        <NotificationContext.Provider value={{ notifications, isLoading, error, refresh: fetchNotifications, markAsReadLocally }}>
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotificationContext() {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotificationContext must be used within a NotificationProvider');
    }
    return context;
}
