'use client';

import Card from '@/components/ui/Card';
import { formatNumber, formatCompactNumber } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import type { RoundupInsightDto } from '@/lib/roundup-insight';
import { LotOfCash, BitcoinCircle, StatUp, InfoCircle } from 'iconoir-react';

interface InsightCardProps {
  insight: RoundupInsightDto;
  shortRow?: boolean;
  minimal?: boolean;
}

export default function InsightCard({ insight, shortRow = false, minimal = false }: InsightCardProps) {
  const { currency } = useCurrency();
  const isEmpty = insight.periodExpenses <= 0;

  // Use Bitcoin scenario specifically if available and requested (or if it's the winner)
  // Otherwise fallback to the general winner
  const displayScenario = insight.bitcoinScenario || insight.investScenario;

  if (isEmpty) {
    return (
      <Card title="Smart Round-up" showActions={false} className={shortRow ? 'px-6 py-4' : ''}>
        <div className="flex flex-col flex-1 min-h-0 justify-center">
          <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap opacity-50">
            <span className="text-card-currency flex-shrink-0 opacity-50">{currency.symbol}</span>
            <span className="text-card-value break-all min-w-0"> 0</span>
          </div>
          <div className="flex items-center gap-2 mt-4 text-sm min-w-0 opacity-50">
            <InfoCircle width={18} height={18} strokeWidth={1.5} className="flex-shrink-0 mt-0.5" />
            <span className="text-wrap-safe break-words leading-tight">Awaiting transaction data</span>
          </div>
        </div>
      </Card>
    );
  }

  const projectedEarnings = displayScenario ? displayScenario.extraOneYear : insight.savingsExtraOneYear;
  const earningSource = displayScenario ? displayScenario.label : 'High-Yield Savings';

  return (
    <Card title="Smart Round-up" showActions={false} className={shortRow ? 'px-6 py-4' : ''}>
      <div className="flex flex-col flex-1 min-h-0 justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
          <span className="text-card-currency flex-shrink-0 opacity-50">{currency.symbol}</span>
          <span className="text-card-value break-all min-w-0"> {formatCompactNumber(projectedEarnings)}</span>
        </div>
        <div className="flex items-start gap-2 mt-4 text-sm min-w-0 text-[#AC66DA]">
          <InfoCircle width={18} height={18} strokeWidth={1.5} className="flex-shrink-0 mt-0.5" />
          <span className="text-wrap-safe break-words leading-tight">
            Could earn by investing 1% in {earningSource}
          </span>
        </div>
      </div>
    </Card>
  );
}
