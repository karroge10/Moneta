import Card from '@/components/ui/Card';
import TrendIndicator from '@/components/ui/TrendIndicator';
import { formatCurrency } from '@/lib/utils';

interface IncomeCardProps {
  amount: number;
  trend: number;
}

export default function IncomeCard({ amount, trend }: IncomeCardProps) {
  return (
    <Card title="Income">
      <div className="flex items-end gap-2 mt-2">
        <span className="text-card-currency">$</span>
        <span className="text-card-value">{amount.toLocaleString('en-US')}</span>
      </div>
      <TrendIndicator value={trend} label="from last month" />
    </Card>
  );
}

