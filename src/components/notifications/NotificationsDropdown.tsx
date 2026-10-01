'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import type { NotificationEntry } from '@/types/dashboard';
import { notificationTextForDisplay } from '@/lib/notification-display';
import { cx } from '@/components/ui/cx';

interface NotificationsDropdownProps {
  notifications: NotificationEntry[];
  isOpen: boolean;
  onClose: () => void;
  onNotificationClick?: (notificationId: string) => void;
  /** Element that toggles the dropdown; clicks on it are not treated as outside clicks. */
  anchorRef?: React.RefObject<HTMLElement | null>;
  id?: string;
}

/** Popover listing recent notifications. Closes on outside click and Escape. */
export default function NotificationsDropdown({
  notifications,
  isOpen,
  onClose,
  onNotificationClick,
  anchorRef,
  id,
}: NotificationsDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const insideDropdown = dropdownRef.current?.contains(target);
      const onAnchor = anchorRef?.current?.contains(target);
      if (!insideDropdown && !onAnchor) onClose();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      onClose();
      anchorRef?.current?.focus();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, anchorRef]);

  if (!isOpen) return null;

  const hasNotifications = notifications.length > 0;

  return (
    <div
      ref={dropdownRef}
      id={id}
      role="region"
      aria-label="Recent notifications"
      className="absolute right-0 top-full z-20 mt-2 w-[min(400px,calc(100vw-2rem))] overflow-hidden rounded-panel bg-surface-1 shadow-lg"
    >
      <div className="border-b border-line-subtle px-4 py-3">
        <h3 className="text-copy font-semibold text-fg">Notifications</h3>
      </div>

      <div className="custom-scrollbar max-h-[400px] overflow-y-auto">
        {hasNotifications ? (
          <ul className="py-2">
            {notifications.map((notification) => (
              <li key={notification.id}>
                <Link
                  href="/notifications"
                  onClick={() => {
                    onNotificationClick?.(notification.id);
                    onClose();
                  }}
                  className={cx(
                    'relative block border-b border-line-subtle px-4 py-3 transition-colors hover:bg-surface-2',
                    !notification.read && 'bg-accent/5',
                  )}
                >
                  {!notification.read && (
                    <span
                      className="absolute left-1.5 top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-accent"
                      aria-hidden="true"
                    />
                  )}
                  <span className="mb-1 flex items-center gap-2">
                    <span className="text-caption tabular-nums text-secondary">
                      {notification.date} {notification.time}
                    </span>
                    <span className="rounded-full bg-surface-0 px-2.5 py-1 text-caption text-fg">
                      {notification.type}
                    </span>
                    {!notification.read && <span className="sr-only">Unread</span>}
                  </span>
                  <span className="line-clamp-2 text-ui text-fg">
                    {notificationTextForDisplay(notification.text)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-4 py-8 text-center text-copy text-secondary">No new notifications</p>
        )}
      </div>

      <div className="border-t border-line-subtle px-4 py-2">
        <Link
          href="/notifications"
          onClick={onClose}
          className="block w-full rounded-chip bg-surface-2 px-3 py-2 text-center text-ui font-semibold text-fg transition-colors hover:bg-surface-3"
        >
          View all
        </Link>
      </div>
    </div>
  );
}
