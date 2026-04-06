'use client';

import Card from '@/components/ui/Card';
import TrendIndicator from '@/components/ui/TrendIndicator';
import { formatCompactNumber } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';

interface IncomeCardProps {
  amount: number;
  trend: number;
  comparisonLabel?: string;
}

export default function IncomeCard({ amount, trend, comparisonLabel }: IncomeCardProps) {
  const { currency } = useCurrency();
  return (
    <Card title="Income" href="/income">
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex flex-col justify-center items-start flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-card-currency shrink-0 opacity-50">{currency.symbol}</span>
            <span className="text-card-value break-all min-w-0">{formatCompactNumber(amount)}</span>
          </div>
        </div>
        {comparisonLabel && comparisonLabel.trim() !== '' && (
          <div className="mt-3">
            <TrendIndicator value={trend} label={comparisonLabel} />
          </div>
        )}
      </div>
    </Card>
  );
}

