'use client';

import dynamic from 'next/dynamic';
import Skeleton from '@/components/ui/Skeleton';

/** recharts is heavy and these charts sit below the first row of cards, so they load after the page. */
export const LazyLineChart = dynamic(() => import('@/components/ui/LineChart'), {
  ssr: false,
  loading: ChartPlaceholder,
});

export const LazyDonutChart = dynamic(() => import('@/components/ui/DonutChart'), {
  ssr: false,
  loading: ChartPlaceholder,
});

function ChartPlaceholder() {
  return <Skeleton className="size-full rounded-panel" />;
}
