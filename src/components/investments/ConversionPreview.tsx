'use client';

import Skeleton from '@/components/ui/Skeleton';
import { formatDecimal } from '@/lib/format';
import { formatSmartNumber } from '@/lib/utils';
import { formatDateForDisplay } from '@/lib/dateFormatting';

interface ConversionPreviewProps {
  /** Total in the transaction currency. */
  total: number;
  rate: number | null;
  loading: boolean;
  side: 'buy' | 'sell';
  date: string;
  fromAlias?: string;
  to: { symbol: string; alias: string };
}

/** Shows what a foreign-currency transaction is worth in the user's currency on the transaction date. */
export default function ConversionPreview({ total, rate, loading, side, date, fromAlias, to }: ConversionPreviewProps) {
  return (
    <div className="flex min-h-20 flex-col justify-center rounded-control border border-line bg-surface-0 p-4" aria-live="polite">
      {loading ? (
        <div className="space-y-3" aria-busy="true">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-6 w-24" />
          </div>
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
      ) : rate !== null ? (
        <>
          <div className="mb-1.5 flex items-center justify-between gap-3 text-ui">
            <span className="text-secondary">Value at {side === 'buy' ? 'purchase' : 'sale'}</span>
            <span className="text-heading font-bold tabular-nums text-fg">
              {to.symbol}
              {formatSmartNumber(total * rate)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 text-caption text-muted">
            <span>Rate on {date ? formatDateForDisplay(date) : 'today'}</span>
            <span className="tabular-nums">
              1 {fromAlias} = {formatRate(rate)} {to.alias}
            </span>
          </div>
        </>
      ) : (
        <p className="text-center text-caption text-muted">Rates unavailable for selected date.</p>
      )}
    </div>
  );
}

function formatRate(rate: number): string {
  const maxDecimals = rate < 1 ? 6 : 4;
  return formatDecimal(rate, { minDecimals: 2, maxDecimals });
}
