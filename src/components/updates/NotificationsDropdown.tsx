'use client';

import { useRef, useEffect, useState } from 'react';
import Link from 'next/link';
import { NotificationEntry } from '@/types/dashboard';

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
  const hasMarkedAsReadRef = useRef(false);
  // Snapshot of notifications when dropdown opens - keeps them visible even after marking as read
  const [snapshotNotifications, setSnapshotNotifications] = useState<NotificationEntry[]>([]);

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

  // Take snapshot and mark as read when dropdown opens
  useEffect(() => {
    if (isOpen && notifications.length > 0 && snapshotNotifications.length === 0 && !hasMarkedAsReadRef.current) {
      // Take snapshot of current notifications to keep them visible
      setSnapshotNotifications(notifications.slice(0, 5));
      
      // Mark all notifications as read immediately when opening dropdown
      hasMarkedAsReadRef.current = true;
      
      fetch('/api/notifications', {
        method: 'PATCH',
      })
        .then(() => {
          // Refresh notifications to update badge and remove purple dot
          onMarkAllRead?.();
        })
        .catch((error) => {
          console.error('Failed to mark notifications as read:', error);
          hasMarkedAsReadRef.current = false;
        });
    }
    
    // Reset flag when dropdown closes
    if (!isOpen) {
      hasMarkedAsReadRef.current = false;
      // Clear snapshot when closing
      if (snapshotNotifications.length > 0) {
        setTimeout(() => {
          setSnapshotNotifications([]);
        }, 100);
      }
    }
  }, [isOpen, notifications, snapshotNotifications.length, onMarkAllRead]);

  if (!isOpen) return null;

  // Use snapshot if available, otherwise use current notifications
  const displayedNotifications = snapshotNotifications.length > 0 
    ? snapshotNotifications 
    : notifications.slice(0, 5);
  const hasNotifications = displayedNotifications.length > 0;

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
            {displayedNotifications.map((notification) => (
              <Link
                key={notification.id}
                href="/updates"
                onClick={async (e) => {
                  e.preventDefault();
                  await onNotificationClick?.(notification.id);
                  // Close dropdown after marking as read (refresh will update badge)
                  setTimeout(() => {
                    onClose();
                  }, 100);
                }}
                className="block px-4 py-2.5 hover:opacity-80 transition-opacity border-b"
                style={{ borderColor: 'rgba(231, 228, 228, 0.05)' }}
              >
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
          href="/updates"
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

