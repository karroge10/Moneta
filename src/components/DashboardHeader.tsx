'use client';

import { useState, useRef, useEffect } from 'react';
import { Crown, Bell, Settings, LogOut, Plus, HeadsetHelp, Upload, CalendarCheck } from 'iconoir-react';
import Link from 'next/link';
import { useClerk } from '@clerk/nextjs';
import NotificationsDropdown from '@/components/updates/NotificationsDropdown';
import { useNotifications } from '@/hooks/useNotifications';
import Dropdown from '@/components/ui/Dropdown';
import { TimePeriod } from '@/types/dashboard';

interface ActionButton {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
}

interface DashboardHeaderProps {
  pageName?: string;
  actionButton?: ActionButton;
  actionButtons?: ActionButton[];
  timePeriod?: TimePeriod;
  onTimePeriodChange?: (period: TimePeriod) => void;
}

const TIME_PERIOD_OPTIONS: TimePeriod[] = [
  'This Month',
  'Last Month',
  'This Year',
  'Last Year',
  'All Time',
];

export default function DashboardHeader({ 
  pageName = 'Dashboard', 
  actionButton, 
  actionButtons,
  timePeriod = 'This Month',
  onTimePeriodChange,
}: DashboardHeaderProps) {
  const { signOut } = useClerk();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const { notifications, refresh } = useNotifications(5, true); // Fetch top 5 unread notifications

  // Update optimistic state when notifications change
  useEffect(() => {
    setHasUnreadNotifications(notifications.length > 0);
  }, [notifications]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex items-center justify-between mb-8 px-6 pt-7">
      <h1 className="text-page-title">{pageName}</h1>
      
      <div className="flex items-center gap-4">
        {(actionButtons || (actionButton ? [actionButton] : [])).map((btn, index) => (
          <button
            key={index}
            onClick={btn.onClick}
            className="flex items-center gap-2 px-4 py-2 rounded-full transition-colors cursor-pointer hover:opacity-90"
            style={{ backgroundColor: '#E7E4E4', color: '#282828' }}
          >
            {btn.icon || <Plus width={18} height={18} strokeWidth={1.5} />}
            <span className="text-sm font-semibold">{btn.label}</span>
          </button>
        ))}
        
        <div className="flex items-center gap-4">
          {onTimePeriodChange && (
            <Dropdown
              label="Time Period"
              options={TIME_PERIOD_OPTIONS}
              value={timePeriod}
              onChange={(value) => onTimePeriodChange(value as TimePeriod)}
              iconLeft={<CalendarCheck width={16} height={16} strokeWidth={1.5} />}
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
          
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="p-2 rounded-lg transition-colors cursor-pointer hover-text-purple"
              aria-label="Settings menu"
            >
              <Settings width={20} height={20} strokeWidth={1.5} className="stroke-current" />
            </button>
            
            {isUserMenuOpen && (
              <div className="absolute top-full mt-2 right-0 rounded-2xl shadow-lg overflow-hidden z-20 min-w-[180px]" style={{ backgroundColor: 'var(--bg-surface)' }}>
                <Link 
                  href="/settings" 
                  className="w-full text-left px-4 py-3 flex items-center gap-2 hover-text-purple transition-colors text-body cursor-pointer"
                  onClick={() => setIsUserMenuOpen(false)}
                >
                  <Settings width={18} height={18} strokeWidth={1.5} className="stroke-current" />
                  Settings
                </Link>
                <Link 
                  href="/help" 
                  className="w-full text-left px-4 py-3 flex items-center gap-2 hover-text-purple transition-colors text-body cursor-pointer"
                  onClick={() => setIsUserMenuOpen(false)}
                >
                  <HeadsetHelp width={18} height={18} strokeWidth={1.5} className="stroke-current" />
                  Help Center
                </Link>
                <Link 
                  href="/pricing" 
                  className="w-full text-left px-4 py-3 flex items-center gap-2 hover-text-purple transition-colors text-body cursor-pointer"
                  onClick={() => setIsUserMenuOpen(false)}
                >
                  <Crown width={18} height={18} strokeWidth={1.5} className="stroke-current" />
                  Premium
                </Link>
                <button 
                  className="w-full text-left px-4 py-3 flex items-center gap-2 hover-text-purple transition-colors text-body cursor-pointer"
                  onClick={async () => {
                    setIsUserMenuOpen(false);
                    await signOut({ redirectUrl: '/' });
                  }}
                >
                  <LogOut width={18} height={18} strokeWidth={1.5} className="stroke-current" />
                  Log Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

