'use client';

import { useRef, useEffect } from 'react';
import Link from 'next/link';
import { NotificationEntry } from '@/types/dashboard';
import { useNotificationContext } from '@/contexts/NotificationContext';

interface NotificationsDropdownProps {
  notifications: NotificationEntry[];
  isOpen: boolean;
  onClose: () => void;
  onNotificationClick?: (notificationId: string) => void;
  onMarkAllRead?: () => void;
}

export default function NotificationsDropdown({
  notifications,
  isOpen,
  onClose,
  onNotificationClick,
  onMarkAllRead,
}: NotificationsDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { markAsReadLocally } = useNotificationContext();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  // Mark all as read when dropdown opens
  useEffect(() => {
    if (isOpen && notifications.some(n => !n.read)) {
      // Mark all notifications as read immediately in local state
      markAsReadLocally();

      fetch('/api/notifications', {
        method: 'PATCH',
      })
        .then(() => {
          onMarkAllRead?.();
        })
        .catch((error) => {
          console.error('Failed to mark notifications as read:', error);
        });
    }
  }, [isOpen, notifications, markAsReadLocally, onMarkAllRead]);

  if (!isOpen) return null;

  const hasNotifications = notifications.length > 0;

  return (
    <div
      ref={dropdownRef}
      className="absolute top-full mt-2 right-0 rounded-2xl shadow-lg overflow-hidden z-20 min-w-[320px] max-w-[400px]"
      style={{ backgroundColor: 'var(--bg-surface)' }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(231, 228, 228, 0.1)' }}>
        <h3 className="text-body font-semibold" style={{ color: '#E7E4E4' }}>
          Notifications
        </h3>
      </div>

      {/* Notifications List */}
      <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
        {hasNotifications ? (
          <div className="py-2">
            {notifications.map((notification) => (
              <Link
                key={notification.id}
                href="/notifications"
                onClick={async (e) => {
                  e.preventDefault();
                  // Mark specific notification as read locally if needed (already marked all though)
                  markAsReadLocally(notification.id);
                  await onNotificationClick?.(notification.id);
                  setTimeout(() => {
                    onClose();
                  }, 100);
                }}
                className={`block px-4 py-3 hover:opacity-80 transition-opacity border-b relative ${!notification.read ? 'bg-[#AC66DA]/5' : ''}`}
                style={{ borderColor: 'rgba(231, 228, 228, 0.05)' }}
              >
                {!notification.read && (
                  <div
                    className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: '#AC66DA' }}
                  />
                )}
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-helper text-xs" style={{ color: '#B9B9B9' }}>
                        {notification.date} {notification.time}
                      </span>
                      <span
                        className="text-xs px-2.5 py-1 rounded-full"
                        style={{
                          backgroundColor: '#202020',
                          color: '#E7E4E4'
                        }}
                      >
                        {notification.type}
                      </span>
                    </div>
                    <p className="text-xs line-clamp-2" style={{ color: '#E7E4E4' }}>
                      {notification.text}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="px-4 py-8 text-center">
            <p className="text-body" style={{ color: '#B9B9B9' }}>
              No new notifications
            </p>
          </div>
        )}
      </div>

      {/* Footer with View All button */}
      <div className="px-4 py-2 border-t" style={{ borderColor: 'rgba(231, 228, 228, 0.1)' }}>
        <Link
          href="/notifications"
          onClick={onClose}
          className="block w-full text-center px-3 py-1.5 rounded-lg transition-opacity cursor-pointer hover:opacity-80 text-sm font-semibold"
          style={{
            backgroundColor: '#282828',
            color: '#E7E4E4'
          }}
        >
          View All
        </Link>
      </div>
    </div>
  );
}

