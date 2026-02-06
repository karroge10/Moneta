'use client';

import Card from '@/components/ui/Card';
import LineChart from '@/components/ui/LineChart';
import TrendIndicator from '@/components/ui/TrendIndicator';
import { PerformanceDataPoint } from '@/types/dashboard';
import { formatNumber } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';

interface PerformanceCardNoPaddingProps {
  trend: number;
  trendText: string;
  data: PerformanceDataPoint[];
}

export default function PerformanceCardNoPadding({ trend, trendText, data }: PerformanceCardNoPaddingProps) {
  const { currency } = useCurrency();
  const currentValue = data.length > 0 ? data[data.length - 1].value : 0;
  const isPositive = trend >= 0;
  const trendColor = isPositive ? 'var(--accent-green)' : 'var(--error)';

  return (
    <Card title="Performance">
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex items-baseline gap-2 mb-1 flex-wrap">
          <span className="text-card-currency flex-shrink-0">{currency.symbol}</span>
          <span className="text-card-value break-all min-w-0">{formatNumber(currentValue)}</span>
        </div>
        <div
          className="text-sidebar-button font-bold mb-4"
          style={{ color: trendColor }}
        >
          {trendText} {currency.symbol} total growth
        </div>
        <div className="mb-4">
          <TrendIndicator value={trend} label="percentage change" />
        </div>
        <div className="flex-1 min-h-0 w-full overflow-hidden" style={{ minHeight: '320px', height: '320px' }}>
          {data && data.length > 0 && (
            <div className="w-full h-full" style={{ marginLeft: '-24px', marginRight: '-24px', width: 'calc(100% + 48px)' }}>
              <LineChart data={data} noPadding={true} currencySymbol={currency.symbol} />
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
