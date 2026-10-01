'use client';

import Dialog from '@/components/ui/Dialog';
import Skeleton from '@/components/ui/Skeleton';
import FinancialHealthBreakdown from '@/components/dashboard/FinancialHealthBreakdown';
import { getHealthColor } from '@/lib/utils';
import { formatDecimal } from '@/lib/format';
import type { FinancialHealthDetails } from '@/types/dashboard';

interface FinancialHealthModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Score from the page's own query; null while it loads. */
  initialData?: FinancialHealthDetails | null;
}

export default function FinancialHealthModal({ isOpen, onClose, initialData }: FinancialHealthModalProps) {
  const loading = initialData == null;
  const score = initialData?.score ?? 0;
  const trend = initialData?.trend ?? 0;

  return (
    <Dialog open={isOpen} onClose={onClose} title="Financial Health Score" size="lg">
      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-12" aria-busy="true">
          <Skeleton className="size-12 rounded-full" />
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      ) : (
        <>
          <div className="mb-6 flex flex-col items-center">
            <span className="text-fin-health-key tabular-nums" style={{ color: getHealthColor(score) }}>
              {formatDecimal(score, { maxDecimals: 0 })}
            </span>
            {trend !== 0 && (
              <span className="mt-2 text-ui text-muted tabular-nums">
                {formatDecimal(trend, { maxDecimals: 0, sign: 'exceptZero' })} vs last period
              </span>
            )}
          </div>
          <h3 className="mb-2 text-heading font-semibold">How we calculate your score</h3>
          <p className="mb-4 text-copy text-secondary text-pretty">
            Your Financial Health Score is based on four areas: Saving, Spending control, Goals, and Engagement.
            It always reflects your full transaction history (all time), not the dashboard period filter.
          </p>
          <FinancialHealthBreakdown details={initialData.details} isEmpty={score === 0} />
        </>
      )}
    </Dialog>
  );
}
