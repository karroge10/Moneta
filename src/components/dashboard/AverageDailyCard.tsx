'use client';

import Card from '@/components/ui/Card';
import TrendIndicator from '@/components/ui/TrendIndicator';
import { formatNumber } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';

interface AverageDailyCardProps {
  amount: number;
  trend: number;
  isExpense?: boolean; // If true, use inverted color logic (negative = good for expenses)
}

export default function AverageDailyCard({ amount, trend, isExpense = false }: AverageDailyCardProps) {
  const { currency } = useCurrency();
  return (
    <Card title="Average Daily">
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
          <span className="text-card-currency flex-shrink-0">{currency.symbol}</span>
          <span className="text-card-value break-all min-w-0">{formatNumber(amount)}</span>
        </div>
        <TrendIndicator value={trend} label="from previous month" isExpense={isExpense} />
      </div>
    </Card>
  );
}


