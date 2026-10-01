'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Skeleton from '@/components/ui/Skeleton';
import Spinner from '@/components/ui/Spinner';
import RangeTabs from '@/components/investments/RangeTabs';
import { useAssetPriceHistory } from '@/hooks/investments/useInvestmentQueries';

const LineChart = dynamic(() => import('@/components/ui/LineChart'), {
  ssr: false,
  loading: () => <Skeleton className="size-full rounded-control" />,
});

interface AssetPriceHistoryProps {
  assetId: string;
  currencySymbol: string;
  disabled: boolean;
}

/** Unit price chart for a live-priced asset. */
export default function AssetPriceHistory({ assetId, currencySymbol, disabled }: AssetPriceHistoryProps) {
  const [range, setRange] = useState('1M');
  const history = useAssetPriceHistory(assetId, range, true);
  const points = history.data ?? [];
  const loading = history.isFetching;

  return (
    <section aria-labelledby="price-history-heading" className="relative overflow-hidden rounded-card border border-line bg-surface-0 p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h3 id="price-history-heading" className="text-ui font-medium">
          Price History
        </h3>
        <RangeTabs value={range} onChange={setRange} disabled={loading || disabled} label="Price history range" />
      </div>
      <div className="relative -ml-4 h-[300px] w-full" aria-busy={loading}>
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface-0/50 backdrop-blur-sm">
            <Spinner size={24} />
          </div>
        )}
        {points.length > 0 ? (
          <LineChart data={points} currencySymbol={currencySymbol} />
        ) : (
          <p className="flex h-full items-center justify-center text-ui text-muted">
            {!loading && (history.isError ? 'Could not load price history' : 'No price history available')}
          </p>
        )}
      </div>
    </section>
  );
}
