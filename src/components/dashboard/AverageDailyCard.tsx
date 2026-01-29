'use client';

import TrendIndicator from '@/components/ui/TrendIndicator';
import ValueCard from '@/components/dashboard/ValueCard';
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
    <ValueCard
      title="Average Daily"
      bottomRow={<TrendIndicator value={trend} label="from previous month" isExpense={isExpense} />}
    >
      <span className="text-card-currency shrink-0">{currency.symbol}</span>
      <span className="text-card-value break-all min-w-0">{formatNumber(amount)}</span>
    </ValueCard>
  );
}


