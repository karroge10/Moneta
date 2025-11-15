'use client';

import Card from '@/components/ui/Card';
import TrendIndicator from '@/components/ui/TrendIndicator';
import { formatCurrency } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';

interface ExpenseCardProps {
  amount: number;
  trend: number;
}

export default function ExpenseCard({ amount, trend }: ExpenseCardProps) {
  const { currency } = useCurrency();
  return (
    <Card title="Expenses" href="/expenses">
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
          <span className="text-card-currency flex-shrink-0">{currency.symbol}</span>
          <span className="text-card-value break-all min-w-0">{amount.toLocaleString('en-US')}</span>
        </div>
        <TrendIndicator value={trend} label="from last month" />
      </div>
    </Card>
  );
}

