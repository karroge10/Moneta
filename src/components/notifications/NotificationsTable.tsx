import type { NotificationEntry } from '@/types/dashboard';
import Skeleton from '@/components/ui/Skeleton';
import { notificationTextForDisplay } from '@/lib/notification-display';

interface NotificationsTableProps {
  notifications: NotificationEntry[];
  isLoading?: boolean;
}

const COL_COUNT = 4;
const SKELETON_ROW_COUNT = 8;

export default function NotificationsTable({ notifications, isLoading = false }: NotificationsTableProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-panel border border-line bg-surface-0">
      <div className="min-h-0 flex-1 overflow-auto" aria-busy={isLoading || undefined}>
        <table className="w-full min-w-[560px]">
          <thead className="sticky top-0 z-10 bg-surface-0">
            <tr className="text-left text-caption uppercase tracking-wide text-muted">
              <th scope="col" className="px-5 py-3 align-top font-semibold">Date</th>
              <th scope="col" className="px-5 py-3 align-top font-semibold">Time</th>
              <th scope="col" className="px-5 py-3 align-top font-semibold">Type</th>
              <th scope="col" className="px-5 py-3 align-top font-semibold">Text</th>
            </tr>
          </thead>
          <tbody className="text-ui">
            {isLoading ? (
              Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
                <tr key={`skeleton-${index}`} className="border-t border-line-subtle">
                  <td className="px-5 py-4"><Skeleton className="h-4 w-20" /></td>
                  <td className="px-5 py-4"><Skeleton className="h-4 w-16" /></td>
                  <td className="px-5 py-4"><Skeleton className="h-4 w-24" /></td>
                  <td className="px-5 py-4"><Skeleton className="h-4 w-48" /></td>
                </tr>
              ))
            ) : notifications.length === 0 ? (
              <tr>
                <td colSpan={COL_COUNT} className="px-5 py-12 text-center text-secondary">
                  No notifications. They are removed automatically after 30 days.
                </td>
              </tr>
            ) : (
              notifications.map((notification) => (
                <tr key={notification.id} className="border-t border-line-subtle transition-colors hover:bg-surface-2">
                  <td className="whitespace-nowrap px-5 py-4 align-top tabular-nums">{notification.date}</td>
                  <td className="whitespace-nowrap px-5 py-4 align-top tabular-nums">{notification.time}</td>
                  <td className="px-5 py-4 align-top">{notification.type}</td>
                  <td className="px-5 py-4 align-top">{notificationTextForDisplay(notification.text)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
