'use client';

import Card from '@/components/ui/Card';
import TrendIndicator from '@/components/ui/TrendIndicator';
import { formatCompactNumber } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';

interface BalanceCardProps {
  amount: number;
  trend: number;
}

export default function BalanceCard({ amount, trend }: BalanceCardProps) {
  const { currency } = useCurrency();

  return (
    <Card title="Balance">
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
          <span className="text-card-currency flex-shrink-0">{currency.symbol}</span>
          <span className="text-card-value break-all min-w-0">{formatCompactNumber(amount)}</span>
        </div>
        <TrendIndicator value={trend} label="from last year" />
      </div>
    </Card>
  );
}

