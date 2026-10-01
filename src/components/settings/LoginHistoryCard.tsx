import Card from '@/components/ui/Card';
import ErrorState from '@/components/ui/ErrorState';
import Skeleton from '@/components/ui/Skeleton';
import type { LoginHistoryEntry } from '@/types/dashboard';

const SKELETON_ROW_COUNT = 4;
const COL_COUNT = 4;
const SKELETON_WIDTHS = ['w-20', 'w-14', 'w-24', 'w-28'];

interface LoginHistoryCardProps {
  history: LoginHistoryEntry[];
  loading?: boolean;
  /** Message when the history could not be loaded. */
  error?: string | null;
  onRetry?: () => void;
  retrying?: boolean;
}

export default function LoginHistoryCard({
  history,
  loading = false,
  error = null,
  onRetry,
  retrying = false,
}: LoginHistoryCardProps) {
  if (error) {
    return (
      <Card title="Login History" showActions={false}>
        <ErrorState title="Could not load login history" onRetry={onRetry} retrying={retrying} />
      </Card>
    );
  }

  return (
    <Card title="Login History" showActions={false}>
      <div className="mt-2 flex min-h-0 flex-1 flex-col overflow-hidden rounded-panel border border-line bg-surface-0">
        <div className="min-h-0 flex-1 overflow-auto" aria-busy={loading || undefined}>
          <table className="w-full min-w-[560px]">
            <thead className="sticky top-0 z-10 bg-surface-0">
              <tr className="text-left text-caption uppercase tracking-wide text-muted">
                <th scope="col" className="px-5 py-3 align-top font-semibold">Date</th>
                <th scope="col" className="px-5 py-3 align-top font-semibold">Time</th>
                <th scope="col" className="px-5 py-3 align-top font-semibold">Device</th>
                <th scope="col" className="px-5 py-3 align-top font-semibold">Location</th>
              </tr>
            </thead>
            <tbody className="text-ui">
              {loading ? (
                Array.from({ length: SKELETON_ROW_COUNT }).map((_, i) => (
                  <tr key={i} className="border-t border-line-subtle">
                    {SKELETON_WIDTHS.map((width) => (
                      <td key={width} className="px-5 py-4 align-top">
                        <Skeleton className={`h-4 ${width}`} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={COL_COUNT} className="px-5 py-12 text-center text-secondary">
                    No login history available.
                  </td>
                </tr>
              ) : (
                history.map((entry, index) => (
                  <tr key={index} className="border-t border-line-subtle transition-colors hover:bg-surface-2">
                    <td className="whitespace-nowrap px-5 py-4 align-top tabular-nums">{entry.date}</td>
                    <td className="whitespace-nowrap px-5 py-4 align-top tabular-nums">{entry.time}</td>
                    <td className="px-5 py-4 align-top">{entry.device}</td>
                    <td className="px-5 py-4 align-top">{entry.location}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
}
