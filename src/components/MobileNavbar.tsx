'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell, Menu } from 'iconoir-react';
import Dropdown from '@/components/ui/Dropdown';
import { CalendarCheck } from 'iconoir-react';
import { TimePeriod } from '@/types/dashboard';
import MobileDrawer from './MobileDrawer';
import NotificationsDropdown from '@/components/updates/NotificationsDropdown';
import { useNotifications } from '@/hooks/useNotifications';

interface MobileNavbarProps {
  pageName: string;
  timePeriod?: TimePeriod;
  onTimePeriodChange?: (period: TimePeriod) => void;
  activeSection?: string;
}

export default function MobileNavbar({ pageName, timePeriod, onTimePeriodChange, activeSection = 'dashboard' }: MobileNavbarProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const timePeriodOptions: TimePeriod[] = ['This Month', 'This Year', 'All Time'];
  const { notifications, refresh } = useNotifications(5, true); // Fetch top 5 unread notifications

  // Update optimistic state when notifications change
  useEffect(() => {
    setHasUnreadNotifications(notifications.length > 0);
  }, [notifications]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };

    if (isNotificationsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isNotificationsOpen]);

  return (
    <>
      <div className="flex items-center justify-between mb-6 px-4 pt-6 md:hidden">
        <h1 className="text-page-title">{pageName}</h1>
        
        <div className="flex items-center gap-3">
          {timePeriod && onTimePeriodChange && (
            <Dropdown
              label="Time Period"
              options={timePeriodOptions}
              value={timePeriod}
              onChange={(value: string) => onTimePeriodChange(value as TimePeriod)}
              iconLeft={<CalendarCheck width={18} height={18} strokeWidth={1.5} />}
            />
          )}
          
          <div className="relative" ref={notificationsRef}>
            <button
              onClick={() => {
                setIsNotificationsOpen(!isNotificationsOpen);
                // Hide dot immediately when opening (optimistic update)
                if (!isNotificationsOpen && hasUnreadNotifications) {
                  setHasUnreadNotifications(false);
                }
              }}
              className="p-2 rounded-lg transition-colors relative cursor-pointer hover-text-purple"
              aria-label="Notifications"
            >
              <Bell width={20} height={20} strokeWidth={1.5} className="stroke-current" />
              {hasUnreadNotifications && (
                <span
                  className="absolute top-0 right-0 blinking-dot"
                  style={{ 
                    width: '8px',
                    height: '8px',
                    backgroundColor: '#AC66DA',
                    borderRadius: '50%'
                  }}
                  aria-label={`${notifications.length} unread notification${notifications.length !== 1 ? 's' : ''}`}
                />
              )}
            </button>
            <NotificationsDropdown
              notifications={notifications}
              isOpen={isNotificationsOpen}
              onClose={() => {
                setIsNotificationsOpen(false);
                refresh(); // Refresh when closing to get latest notifications
              }}
              onMarkAllRead={() => {
                // Refresh notifications after marking all as read to update badge
                refresh();
              }}
              onNotificationClick={async (notificationId) => {
                try {
                  const response = await fetch(`/api/notifications/${notificationId}/read`, {
                    method: 'PATCH',
                  });
                  if (response.ok) {
                    // Refresh notifications immediately to update the badge and remove purple dot
                    await refresh();
                  }
                } catch (error) {
                  console.error('Failed to mark notification as read:', error);
                }
              }}
            />
          </div>
          
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="p-2 rounded-lg transition-colors cursor-pointer hover-text-purple"
            aria-label="Open menu"
          >
            <Menu width={20} height={20} strokeWidth={1.5} className="stroke-current" />
          </button>
        </div>
      </div>

      <MobileDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} activeSection={activeSection} />
    </>
  );
}

