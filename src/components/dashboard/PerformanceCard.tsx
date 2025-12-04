import Card from '@/components/ui/Card';
import LineChart from '@/components/ui/LineChart';
import { PerformanceDataPoint } from '@/types/dashboard';
import { StatUp, StatDown } from 'iconoir-react';
import { getTrendColor, getExpenseTrendColor } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';

interface PerformanceCardProps {
  trend: number;
  trendText: string;
  data: PerformanceDataPoint[];
  isExpense?: boolean; // If true, use inverted color logic (negative = good for expenses)
}

export default function PerformanceCard({ trend, trendText, data, isExpense = false }: PerformanceCardProps) {
  const { currency } = useCurrency();
  const trendColor = isExpense ? getExpenseTrendColor(trend) : getTrendColor(trend);
  // For expenses: negative trend means spending less (good), so show StatDown in green
  // For income: positive trend means earning more (good), so show StatUp in green
  const Icon = isExpense 
    ? (trend <= 0 ? StatDown : StatUp)
    : (trend >= 0 ? StatUp : StatDown);

  return (
    <Card title="Performance">
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex items-center gap-2 mb-4">
          <Icon width={20} height={20} strokeWidth={1.5} style={{ color: trendColor }} />
          <span className="text-body" style={{ color: trendColor }}>
            {trendText}
          </span>
        </div>
        <div className="flex-1 min-h-0" style={{ minHeight: '280px' }}>
          <LineChart data={data} currencySymbol={currency.symbol} />
        </div>
      </div>
    </Card>
  );
}

