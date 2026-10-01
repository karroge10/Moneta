'use client';

import ValueCard from '@/components/dashboard/ValueCard';
import MoneyFigure from '@/components/dashboard/MoneyFigure';
import TrendFooter from '@/components/dashboard/TrendFooter';

interface AverageDailyCardProps {
  amount: number;
  trend: number;
  trendSkipped?: boolean;
  isExpense?: boolean;
}

export default function AverageDailyCard({ amount, trend, trendSkipped, isExpense = false }: AverageDailyCardProps) {
  return (
    <ValueCard
      title="Average Daily"
      bottomRow={<TrendFooter trend={trend} label="from previous month" skipped={trendSkipped} isExpense={isExpense} />}
    >
      <MoneyFigure amount={amount} />
    </ValueCard>
  );
}
