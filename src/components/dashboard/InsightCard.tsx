import Card from '@/components/ui/Card';
import TrendIndicator from '@/components/ui/TrendIndicator';

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
          <span className="text-card-value">{amount.toFixed(2)}</span>
        </div>
        <div className="text-body">
          <span>{message} </span>
          <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>${investmentAmount}</span>
        </div>
      </div>
    </Card>
  );
}

