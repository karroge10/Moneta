'use client';

import Card from '@/components/ui/Card';
import { formatNumber } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import type { RoundupInsightDto } from '@/lib/roundup-insight';
import type { TimePeriod } from '@/types/dashboard';
import { InfoCircle } from 'iconoir-react';

interface InsightCardProps {
  insight: RoundupInsightDto;
  timePeriod?: TimePeriod;
  shortRow?: boolean;
  minimal?: boolean;
}

export default function InsightCard({
  insight,
  timePeriod,
  shortRow = false,
  minimal = false,
}: InsightCardProps) {
  const { currency } = useCurrency();
  const isEmpty = insight.periodExpenses <= 0;
  const compact = shortRow || minimal;
  const periodLabel = timePeriod ?? 'This period';

  const footerGap = compact ? 'mt-2' : 'mt-4';

  if (isEmpty) {
    return (
      <Card title="Smart Round Up" showActions={false} className={shortRow ? 'px-6 py-4' : ''}>
        <div className="flex flex-col flex-1 min-h-0 justify-center">
          <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap opacity-50">
            <span className="text-card-currency shrink-0 opacity-50">{currency.symbol}</span>
            <span className="text-card-value break-all min-w-0">0</span>
          </div>
          <div className="flex items-center gap-2 mt-4 text-sm min-w-0 opacity-50">
            <InfoCircle width={18} height={18} strokeWidth={1.5} className="shrink-0 mt-0.5" />
            <span className="text-wrap-safe wrap-break-word leading-tight">
              No expenses in {periodLabel}. Change the date range to see 1% of spending.
            </span>
          </div>
        </div>
      </Card>
    );
  }

  const best = insight.yearAgoBest;
  const profitAbs = best ? Math.abs(best.hypotheticalProfit) : 0;
  const profitFormatted = `${currency.symbol}${formatNumber(profitAbs)}`;

  const purpleLine = !best
    ? compact
      ? 'Could not load 1-year prices right now. Cached data refreshes about once a day.'
      : 'We could not load 1-year price history for the watchlist. This updates on a timer (about once per day), not on every page view.'
    : best.hypotheticalProfit >= 0
      ? `Would earn ${profitFormatted} if invested in ${best.label} a year ago.`
      : `Would have lost ${profitFormatted} if invested in ${best.label} a year ago.`;

  return (
    <Card title="Smart Round Up" showActions={false} className={shortRow ? 'px-6 py-4' : ''}>
      <div className="flex flex-col flex-1 min-h-0 justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
          <span className="text-card-currency shrink-0 opacity-50">{currency.symbol}</span>
          <span className="text-card-value break-all min-w-0">{formatNumber(insight.roundupTotal)}</span>
        </div>
        <div className={`flex items-start gap-2 ${footerGap} text-sm min-w-0 text-[#AC66DA]`}>
          <InfoCircle width={18} height={18} strokeWidth={1.5} className="shrink-0 mt-0.5" />
          <span className="text-wrap-safe wrap-break-word leading-tight">{purpleLine}</span>
        </div>
      </div>
    </Card>
  );
}
