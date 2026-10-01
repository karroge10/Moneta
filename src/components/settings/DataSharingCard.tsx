'use client';

import { useId } from 'react';
import { InfoCircle } from 'iconoir-react';
import Card from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';
import Switch from './Switch';

interface DataSharingCardProps {
  isEnabled?: boolean;
  onToggle?: (enabled: boolean) => void;
  loading?: boolean;
  disabled?: boolean;
}

/**
 * Opt-in for peer comparisons on the Statistics page. The copy matches /api/statistics: only users with
 * sharing on are pooled into cohorts (by age group, country or profession), and both contributing and
 * seeing comparisons require it.
 */
export default function DataSharingCard({
  isEnabled = true,
  onToggle,
  loading = false,
  disabled = false,
}: DataSharingCardProps) {
  const labelId = useId();
  const descriptionId = useId();

  if (loading) {
    return (
      <Card title="Data Sharing" showActions={false}>
        <div className="flex items-center gap-4" aria-busy="true">
          <span className="sr-only">Loading data sharing setting</span>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[90%]" />
          </div>
          <Skeleton className="h-6 w-12 shrink-0 rounded-full" />
        </div>
      </Card>
    );
  }

  return (
    <Card title="Data Sharing" showActions={false}>
      <div className="flex items-start gap-4">
        <InfoCircle width={24} height={24} strokeWidth={1.5} className="mt-0.5 shrink-0 text-secondary" aria-hidden="true" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <p id={labelId} className="text-copy font-semibold text-fg">
            Compare with people like you
          </p>
          <div id={descriptionId} className="flex flex-col gap-2 text-ui text-secondary text-pretty">
            <p>
              When on, your income, expenses, goal success rate, portfolio balance and financial health score are
              pooled with other members who also opted in. The Statistics page uses that pool to show how each
              member compares with the average for their age group, country or profession. Others never see your
              name, email or individual transactions.
            </p>
            <p>Turning it off removes you from those averages and hides the comparisons for you too.</p>
          </div>
        </div>
        <Switch
          checked={isEnabled}
          onChange={(enabled) => onToggle?.(enabled)}
          disabled={disabled}
          labelledBy={labelId}
          aria-describedby={descriptionId}
        />
      </div>
    </Card>
  );
}
