import AverageCard from '@/components/dashboard/AverageCard';
import AverageDailyCard from '@/components/dashboard/AverageDailyCard';
import type { CashflowSummary } from '@/hooks/useCashflowData';

interface CashflowAverageCardProps {
  summary: CashflowSummary;
  isExpense: boolean;
  /** This Month or Last Month, where the API sends a daily average. */
  isDailyPeriod: boolean;
  trendLabel: string;
}

/** Daily average for month periods, monthly average otherwise. */
export default function CashflowAverageCard({ summary, isExpense, isDailyPeriod, trendLabel }: CashflowAverageCardProps) {
  const daily = summary.averageDaily;
  if (isDailyPeriod && daily) {
    return <AverageDailyCard amount={daily.amount} trend={daily.trend} trendSkipped={daily.trendSkipped} isExpense={isExpense} />;
  }

  const average = summary.average;
  return (
    <AverageCard
      amount={average.amount}
      trend={average.trend}
      trendSkipped={average.trendSkipped}
      subtitle={average.subtitle}
      trendLabel={trendLabel}
      isExpense={isExpense}
    />
  );
}
