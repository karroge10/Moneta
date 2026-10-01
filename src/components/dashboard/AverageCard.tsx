'use client';

import Card from '@/components/ui/Card';
import MoneyFigure from '@/components/dashboard/MoneyFigure';
import TrendFooter from '@/components/dashboard/TrendFooter';

interface AverageCardProps {
  amount: number;
  trend: number;
  trendSkipped?: boolean;
  subtitle?: string;
  trendLabel?: string;
  /** For spending a rise is bad, so trend colors flip. */
  isExpense?: boolean;
}

export default function AverageCard({ amount, trend, trendSkipped, subtitle, trendLabel = 'from last year', isExpense = false }: AverageCardProps) {
  return (
    <Card title="Average">
      <div className="flex min-h-0 flex-1 flex-col">
        {subtitle && <div className="text-helper mb-2">{subtitle}</div>}
        <div className="flex min-w-0 flex-1 flex-col items-start justify-center">
          <div className="flex flex-wrap items-center gap-2">
            <MoneyFigure amount={amount} compact />
          </div>
        </div>
        <div className="mt-3">
          <TrendFooter trend={trend} label={trendLabel} skipped={trendSkipped} isExpense={isExpense} />
        </div>
      </div>
    </Card>
  );
}
