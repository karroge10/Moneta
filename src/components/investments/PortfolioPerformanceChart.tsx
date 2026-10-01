'use client';

import dynamic from 'next/dynamic';
import Card from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';
import Spinner from '@/components/ui/Spinner';
import RangeTabs from './RangeTabs';

const LineChart = dynamic(() => import('@/components/ui/LineChart'), {
  ssr: false,
  loading: () => <Skeleton className="size-full rounded-control" />,
});

interface PortfolioPerformanceChartProps {
  data: Array<{ date: string; value: number }>;
  currencySymbol: string;
  range: string;
  onRangeChange: (range: string) => void;
  isLoading?: boolean;
  /** The selected range failed to load. */
  isError?: boolean;
}

/** Portfolio value over time with a range switcher. */
export default function PortfolioPerformanceChart({
  data,
  currencySymbol,
  range,
  onRangeChange,
  isLoading = false,
  isError = false,
}: PortfolioPerformanceChartProps) {
  return (
    <Card title="Performance" className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="mb-4 flex items-center justify-end gap-2">
        <RangeTabs value={range} onChange={onRangeChange} disabled={isLoading} label="Performance range" />
      </div>

      <div className="relative -ml-4 min-h-0 w-full flex-1" aria-busy={isLoading}>
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface-1/50 backdrop-blur-sm">
            <Spinner size={24} />
          </div>
        )}
        {isError ? (
          <p role="alert" className="flex h-full items-center justify-center text-ui text-negative-fg">
            Failed to update chart
          </p>
        ) : data.length > 0 ? (
          <LineChart data={data} currencySymbol={currencySymbol} />
        ) : (
          <p className="flex h-full items-center justify-center text-ui text-muted">No performance data available</p>
        )}
      </div>
    </Card>
  );
}
