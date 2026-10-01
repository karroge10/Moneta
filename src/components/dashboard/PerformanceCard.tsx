'use client';

import { StatUp, StatDown } from 'iconoir-react';
import Card from '@/components/ui/Card';
import { LazyLineChart } from '@/components/dashboard/LazyCharts';
import type { PerformanceDataPoint } from '@/types/dashboard';
import { useCurrency } from '@/hooks/useCurrency';

interface PerformanceCardProps {
  trend: number;
  /** Sentence from the API that already states the direction, e.g. "Your expenses grew +5% this year". */
  trendText: string;
  data: PerformanceDataPoint[];
  /** For spending a rise is bad, so the color flips; the arrow follows the real direction. */
  isExpense?: boolean;
}

export default function PerformanceCard({ trend, trendText, data, isExpense = false }: PerformanceCardProps) {
  const { currency } = useCurrency();
  const isGood = isExpense ? trend <= 0 : trend >= 0;
  const isRise = isExpense ? trend > 0 : trend >= 0;
  const Icon = isRise ? StatUp : StatDown;

  return (
    <Card title="Performance">
      <div className="flex min-h-0 flex-1 flex-col">
        <p className={`mb-4 flex items-center gap-2 text-body ${isGood ? 'text-positive' : 'text-negative-fg'}`}>
          <Icon width={20} height={20} strokeWidth={1.5} aria-hidden="true" className="shrink-0" />
          <span>{trendText}</span>
        </p>
        <div className="mt-2 h-[280px] w-full">
          <LazyLineChart data={data} currencySymbol={currency.symbol} />
        </div>
      </div>
    </Card>
  );
}
