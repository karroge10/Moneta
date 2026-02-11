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
        <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
          <span className="text-card-currency flex-shrink-0">{currency.symbol}</span>
          <span className="text-card-value break-all min-w-0">{formatCompactNumber(amount)}</span>
        </div>
        {comparisonLabel && comparisonLabel.trim() !== '' && <TrendIndicator value={trend} label={comparisonLabel} />}
      </div>
    </Card>
  );
}

