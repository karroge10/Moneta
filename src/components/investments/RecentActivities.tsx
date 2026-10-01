'use client';

import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import { cx } from '@/components/ui/cx';
import AssetAvatar from './AssetAvatar';
import { formatDateForDisplay } from '@/lib/dateFormatting';
import { formatQuantity } from '@/lib/format';
import type { InvestmentRecentActivity } from '@/types/investments';

interface RecentActivitiesProps {
  activities: InvestmentRecentActivity[];
  onSelect: (activity: InvestmentRecentActivity) => void;
}

/** Latest buys and sells: a table from lg up, tappable cards below. */
export default function RecentActivities({ activities, onSelect }: RecentActivitiesProps) {
  return (
    <Card title="Recent Activities">
      <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden rounded-card border border-line bg-surface-0">
        {activities.length === 0 ? (
          <EmptyState title="No recent investment activity." />
        ) : (
          <div className="max-h-[500px] flex-1 overflow-auto 2xl:max-h-[400px]">
            <ActivityTable activities={activities} onSelect={onSelect} />
            <ActivityCards activities={activities} onSelect={onSelect} />
          </div>
        )}
      </div>
    </Card>
  );
}

function ActivityTable({ activities, onSelect }: RecentActivitiesProps) {
  return (
    <table className="hidden min-w-full lg:table">
      <thead className="sticky top-0 z-10 bg-surface-0">
        <tr className="text-left text-caption uppercase tracking-wide text-muted">
          <th scope="col" className="px-5 py-3 align-top font-medium">Asset</th>
          <th scope="col" className="px-5 py-3 align-top font-medium">Date</th>
          <th scope="col" className="px-5 py-3 align-top font-medium">Type</th>
          <th scope="col" className="px-5 py-3 align-top font-medium">Quantity</th>
        </tr>
      </thead>
      <tbody>
        {activities.map((activity) => (
          <tr
            key={activity.id}
            onClick={() => onSelect(activity)}
            className="cursor-pointer border-t border-line-subtle transition-colors hover:bg-surface-1"
          >
            <td className="px-5 py-4 align-top">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onSelect(activity);
                }}
                aria-label={`Edit ${activity.type.toLowerCase()} of ${activity.name}`}
                className="flex items-center gap-3 rounded-control text-left focus-visible:outline-2 focus-visible:outline-accent"
              >
                <AssetAvatar icon={activity.icon} assetType={activity.assetType} />
                <span>
                  <span className="block text-ui font-semibold">{activity.name}</span>
                  <span className="block text-caption uppercase tracking-wider text-muted">{activity.ticker}</span>
                </span>
              </button>
            </td>
            <td className="px-5 py-4 align-top text-ui">{formatDateForDisplay(activity.date)}</td>
            <td className="px-5 py-4 align-top">
              <SideLabel type={activity.type} />
            </td>
            <td className="px-5 py-4 align-top text-ui font-semibold tabular-nums">
              {formatQuantity(activity.quantity)} {activity.ticker}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ActivityCards({ activities, onSelect }: RecentActivitiesProps) {
  return (
    <ul className="flex flex-col gap-4 p-4 lg:hidden">
      {activities.map((activity) => (
        <li key={activity.id}>
          <button
            type="button"
            onClick={() => onSelect(activity)}
            className="w-full rounded-panel border border-line bg-surface-1 p-4 text-left transition-transform active:scale-[0.98]"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <AssetAvatar icon={activity.icon} assetType={activity.assetType} />
                <div className="min-w-0">
                  <div className="truncate text-ui font-bold">{activity.name}</div>
                  <div className="text-caption uppercase tracking-wider text-muted">{activity.ticker}</div>
                </div>
              </div>
              <SideLabel type={activity.type} pill />
            </div>
            <dl className="space-y-3 text-ui">
              <div className="flex items-center justify-between border-b border-line-subtle py-2">
                <dt className="text-secondary">Date</dt>
                <dd className="font-medium">{formatDateForDisplay(activity.date)}</dd>
              </div>
              <div className="flex items-center justify-between py-2">
                <dt className="text-secondary">Quantity</dt>
                <dd className="font-bold tabular-nums">
                  {formatQuantity(activity.quantity)} {activity.ticker}
                </dd>
              </div>
            </dl>
            <span className="mt-4 block w-full rounded-control border border-line-subtle bg-surface-2 py-2.5 text-center text-ui font-semibold text-accent-fg">
              View Details
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/** "Buy" / "Sell" text in green or red; the word carries the meaning, color only reinforces it. */
function SideLabel({ type, pill = false }: { type: 'Buy' | 'Sell'; pill?: boolean }) {
  const isBuy = type === 'Buy';
  return (
    <span
      className={cx(
        'font-semibold',
        isBuy ? 'text-positive' : 'text-negative-fg',
        pill ? 'shrink-0 rounded-full px-3 py-1 text-caption font-bold uppercase tracking-tight' : 'text-ui',
        pill && (isBuy ? 'bg-positive/10' : 'bg-negative/10'),
      )}
    >
      {type}
    </span>
  );
}
