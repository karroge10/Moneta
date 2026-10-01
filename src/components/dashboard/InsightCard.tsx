'use client';

import { InfoCircle } from 'iconoir-react';
import Card from '@/components/ui/Card';
import MoneyFigure from '@/components/dashboard/MoneyFigure';
import { formatMoney } from '@/lib/format';
import { useCurrency } from '@/hooks/useCurrency';
import type { RoundupInsightDto } from '@/lib/roundup-insight';
import type { TimePeriod } from '@/types/dashboard';

interface InsightCardProps {
  insight: RoundupInsightDto;
  timePeriod?: TimePeriod;
  shortRow?: boolean;
  minimal?: boolean;
}

const SHORT_DISCLAIMER = 'Illustrative only. Past returns do not predict future results.';

/**
 * Round-up: 1% of the period's spending, and what that sum would have done in one asset over the
 * past year. The figure is plain arithmetic on cached prices, so the copy says "would have" and
 * always carries the disclaimer.
 */
export default function InsightCard({ insight, timePeriod, shortRow = false, minimal = false }: InsightCardProps) {
  const { currency } = useCurrency();
  const compact = shortRow || minimal;
  const cardClass = shortRow ? 'px-6 py-4' : '';

  if (insight.periodExpenses <= 0) {
    const periodLabel = timePeriod ?? 'this period';
    return (
      <Card title="Round-up" showActions={false} className={cardClass}>
        <div className="flex min-h-0 flex-1 flex-col justify-center">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 opacity-50">
            <MoneyFigure amount={0} compact />
          </div>
          <p className="mt-4 flex min-w-0 items-start gap-2 text-ui text-muted">
            <InfoCircle width={18} height={18} strokeWidth={1.5} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span className="text-wrap-safe wrap-break-word leading-tight">
              No expenses in {periodLabel}. Change the date range to see 1% of spending.
            </span>
          </p>
        </div>
      </Card>
    );
  }

  const message = describeBest(insight, currency.symbol, compact);

  return (
    <Card title="Round-up" showActions={false} className={cardClass}>
      <div className="flex min-h-0 flex-1 flex-col justify-between">
        <div>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <MoneyFigure amount={insight.roundupTotal} />
          </div>
          <p className="text-helper mt-1">1% of spending in {timePeriod ?? 'this period'}</p>
        </div>
        <div className={compact ? 'mt-2' : 'mt-4'}>
          <p className="flex min-w-0 items-start gap-2 text-ui text-accent-fg">
            <InfoCircle width={18} height={18} strokeWidth={1.5} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span className="text-wrap-safe wrap-break-word leading-tight">{message}</span>
          </p>
          <p className="mt-1 text-caption text-muted text-pretty">{compact ? SHORT_DISCLAIMER : insight.disclaimer}</p>
        </div>
      </div>
    </Card>
  );
}

function describeBest(insight: RoundupInsightDto, symbol: string, compact: boolean): string {
  const best = insight.yearAgoBest;
  if (!best) {
    return compact
      ? 'Could not load 1-year prices right now. Cached data refreshes about once a day.'
      : 'We could not load 1-year price history for the watchlist. This updates on a timer (about once per day), not on every page view.';
  }
  const profit = formatMoney(Math.abs(best.hypotheticalProfit), symbol);
  return best.hypotheticalProfit >= 0
    ? `Invested in ${best.label} a year ago, this would have earned ${profit}.`
    : `Invested in ${best.label} a year ago, this would have lost ${profit}.`;
}
