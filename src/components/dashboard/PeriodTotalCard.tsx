'use client';

import Card from '@/components/ui/Card';
import TrendIndicator from '@/components/ui/TrendIndicator';
import MoneyFigure from '@/components/dashboard/MoneyFigure';
import MissingRatesNote from '@/components/dashboard/MissingRatesNote';

interface PeriodTotalCardProps {
  type: 'income' | 'expense';
  amount: number;
  trend: number;
  comparisonLabel?: string;
  /** Transactions left out of the total for lack of an exchange rate. */
  missingRates?: number;
}

/** Dashboard Income or Expenses total for the selected period, linking to its page. */
export default function PeriodTotalCard({ type, amount, trend, comparisonLabel, missingRates = 0 }: PeriodTotalCardProps) {
  const isExpense = type === 'expense';
  const showTrend = comparisonLabel !== undefined && comparisonLabel.trim() !== '';

  return (
    <Card title={isExpense ? 'Expenses' : 'Income'} href={isExpense ? '/expenses' : '/income'}>
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-w-0 flex-1 flex-col items-start justify-center">
          <div className="flex flex-wrap items-center gap-2">
            <MoneyFigure amount={amount} compact />
          </div>
        </div>
        {showTrend && (
          <div className="mt-3">
            <TrendIndicator value={trend} label={comparisonLabel} isExpense={isExpense} />
          </div>
        )}
        <MissingRatesNote count={missingRates} className="mt-2" />
      </div>
    </Card>
  );
}
