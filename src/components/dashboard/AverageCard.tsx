import Card from '@/components/ui/Card';
import TrendIndicator from '@/components/ui/TrendIndicator';
import { formatNumber } from '@/lib/utils';

interface AverageCardProps {
  amount: number;
  trend: number;
  subtitle?: string;
}

export default function AverageCard({ amount, trend, subtitle }: AverageCardProps) {
  return (
    <Card title="Average">
      <div className="flex flex-col flex-1 min-h-0">
        {subtitle && (
          <div className="text-helper mb-2">{subtitle}</div>
        )}
        <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
          <span className="text-card-currency flex-shrink-0">$</span>
          <span className="text-card-value break-all min-w-0">{formatNumber(amount)}</span>
        </div>
        <TrendIndicator value={trend} label="from last year" />
      </div>
    </Card>
  );
}

