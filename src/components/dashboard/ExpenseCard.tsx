import Card from '@/components/ui/Card';
import TrendIndicator from '@/components/ui/TrendIndicator';
import { formatCurrency } from '@/lib/utils';

interface ExpenseCardProps {
  amount: number;
  trend: number;
}

export default function ExpenseCard({ amount, trend }: ExpenseCardProps) {
  return (
    <Card title="Expenses">
      <div className="flex items-end gap-2 mt-2">
        <span className="text-card-currency">$</span>
        <span className="text-card-value">{amount.toLocaleString('en-US')}</span>
      </div>
      <TrendIndicator value={trend} label="from last month" />
    </Card>
  );
}

