import Card from '@/components/ui/Card';
import TrendIndicator from '@/components/ui/TrendIndicator';
import { formatNumber } from '@/lib/utils';

interface InsightCardProps {
  title: string;
  amount: number;
  message: string;
  investmentAmount: number;
  trend: number;
}

export default function InsightCard({ title, amount, message, investmentAmount, trend }: InsightCardProps) {
  return (
    <Card title="Insight">
      <div className="mt-2">
        <div className="text-helper mb-4">{title}</div>
        <div className="flex items-end gap-2 mb-4">
          <span className="text-card-currency">$</span>
          <span className="text-card-value">{formatNumber(amount)}</span>
        </div>
        <div className="text-body">
          <span>{message} </span>
          <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>${formatNumber(investmentAmount, false)}</span>
        </div>
      </div>
    </Card>
  );
}

