'use client';

import { useId, useRef, useState } from 'react';
import { Bell } from 'iconoir-react';
import type { NotificationEntry } from '@/types/dashboard';
import NotificationsDropdown from '@/components/notifications/NotificationsDropdown';
import { useNotifications } from '@/hooks/useNotifications';

const UNREAD_PREVIEW_LIMIT = 5;

/**
 * Bell button with an unread dot and the recent-notifications popover. Opening it marks everything
 * read; the popover keeps showing the list it opened with so items do not vanish under the cursor.
 */
export default function NotificationBell() {
  const { notifications, markAsRead } = useNotifications(UNREAD_PREVIEW_LIMIT, true);
  const [openedWith, setOpenedWith] = useState<NotificationEntry[] | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownId = useId();
  const isOpen = openedWith !== null;
  const unreadCount = notifications.length;
  const buttonLabel = unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications';

  const close = () => setOpenedWith(null);

  const toggle = () => {
    if (isOpen) {
      close();
      return;
    }
    setOpenedWith(notifications);
    if (unreadCount > 0) markAsRead();
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-label={buttonLabel}
        aria-expanded={isOpen}
        aria-controls={isOpen ? dropdownId : undefined}
        className="hover-text-purple relative inline-flex size-10 items-center justify-center rounded-control transition-colors"
      >
        <Bell width={20} height={20} strokeWidth={1.5} className="stroke-current" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="blinking-dot absolute right-2 top-2 size-2 rounded-full bg-accent" aria-hidden="true" />
        )}
      </button>
      <NotificationsDropdown
        id={dropdownId}
        notifications={openedWith ?? []}
        isOpen={isOpen}
        onClose={close}
        anchorRef={buttonRef}
      />
    </div>
  );
}
