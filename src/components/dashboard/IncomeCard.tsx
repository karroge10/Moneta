import Card from '@/components/ui/Card';
import TrendIndicator from '@/components/ui/TrendIndicator';
import { formatCurrency } from '@/lib/utils';

interface IncomeCardProps {
  amount: number;
  trend: number;
}

export default function IncomeCard({ amount, trend }: IncomeCardProps) {
  return (
    <Card title="Income" href="/income">
      <div className="flex flex-col flex-1">
        <div className="flex items-center gap-2 flex-1">
          <span className="text-card-currency">$</span>
          <span className="text-card-value">{amount.toLocaleString('en-US')}</span>
        </div>
        <TrendIndicator value={trend} label="from last month" />
      </div>
    </Card>
  );
}

