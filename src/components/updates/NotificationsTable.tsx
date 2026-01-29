'use client';

import { NotificationEntry } from '@/types/dashboard';

interface NotificationsTableProps {
  notifications: NotificationEntry[];
  isLoading?: boolean;
}

const COL_COUNT = 4;

export default function NotificationsTable({
  notifications,
  isLoading = false,
}: NotificationsTableProps) {
  return (
    <div
      className="flex-1 flex flex-col min-h-0 rounded-3xl border border-[#3a3a3a] overflow-hidden"
      style={{ backgroundColor: '#202020' }}
    >
      <div className="flex-1 min-h-0 overflow-auto">
        <table className="min-w-full">
          <thead className="sticky top-0 z-10" style={{ backgroundColor: '#202020' }}>
            <tr className="text-left text-xs uppercase tracking-wide" style={{ color: '#9CA3AF' }}>
              <th className="px-5 py-3 align-top">Date</th>
              <th className="px-5 py-3 align-top">Time</th>
              <th className="px-5 py-3 align-top">Type</th>
              <th className="px-5 py-3 align-top">Text</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, index) => (
                <tr key={`skeleton-${index}`} className="border-t border-[#2A2A2A]">
                  <td className="px-5 py-4">
                    <div className="h-4 w-20 rounded animate-pulse" style={{ backgroundColor: '#3a3a3a' }} />
                  </td>
                  <td className="px-5 py-4">
                    <div className="h-4 w-16 rounded animate-pulse" style={{ backgroundColor: '#3a3a3a' }} />
                  </td>
                  <td className="px-5 py-4">
                    <div className="h-4 w-24 rounded animate-pulse" style={{ backgroundColor: '#3a3a3a' }} />
                  </td>
                  <td className="px-5 py-4">
                    <div className="h-4 w-48 rounded animate-pulse" style={{ backgroundColor: '#3a3a3a' }} />
                  </td>
                </tr>
              ))
            ) : notifications.length === 0 ? (
              <tr>
                <td
                  colSpan={COL_COUNT}
                  className="px-5 py-12 text-center text-sm"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  No notifications. They are automatically removed after 30 days.
                </td>
              </tr>
            ) : (
              notifications.map((notification) => (
                <tr
                  key={notification.id}
                  className="border-t border-[#2A2A2A] hover:opacity-80 transition-opacity"
                >
                  <td className="px-5 py-4 align-top">
                    <span className="text-sm">{notification.date}</span>
                  </td>
                  <td className="px-5 py-4 align-top">
                    <span className="text-sm">{notification.time}</span>
                  </td>
                  <td className="px-5 py-4 align-top">
                    <span className="text-sm">{notification.type}</span>
                  </td>
                  <td className="px-5 py-4 align-top">
                    <span className="text-sm">{notification.text}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
