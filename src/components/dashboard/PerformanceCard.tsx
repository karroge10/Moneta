import Card from '@/components/ui/Card';
import LineChart from '@/components/ui/LineChart';
import { PerformanceDataPoint } from '@/types/dashboard';
import { StatUp } from 'iconoir-react';
import { getTrendColor } from '@/lib/utils';

interface PerformanceCardProps {
  trend: number;
  trendText: string;
  data: PerformanceDataPoint[];
}

export default function PerformanceCard({ trend, trendText, data }: PerformanceCardProps) {
  const trendColor = getTrendColor(trend);

  return (
    <Card title="Performance">
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex items-center gap-2 mb-4">
          <StatUp width={20} height={20} strokeWidth={1.5} style={{ color: trendColor }} />
          <span className="text-body" style={{ color: trendColor }}>
            {trendText}
          </span>
        </div>
        <div className="flex-1 min-h-0" style={{ minHeight: '280px' }}>
          <LineChart data={data} />
        </div>
      </div>
    </Card>
  );
}

