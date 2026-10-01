import CardSkeleton from '@/components/dashboard/CardSkeleton';
import CashflowLayout, { type CashflowSlots } from '@/components/cashflow/CashflowLayout';
import type { CashflowConfig } from '@/components/cashflow/cashflow-config';

/** Expenses or income placeholder in the same layout as the loaded page. */
export default function CashflowSkeleton({ config, isDailyPeriod }: { config: CashflowConfig; isDailyPeriod: boolean }) {
  const isExpense = config.type === 'expense';
  const averageTitle = isDailyPeriod ? 'Average Daily' : config.averageTitle;
  const average = <CardSkeleton title={averageTitle} variant="value" />;

  const slots: CashflowSlots = {
    update: <CardSkeleton title="Update" variant="update" />,
    total: <CardSkeleton title="Total" variant="value" />,
    side: isExpense ? average : <CardSkeleton title="Estimated Tax" variant="value" />,
    upcoming: <CardSkeleton title={config.upcoming.title} variant="list" />,
    latest: <CardSkeleton title={config.latest.title} variant="list" />,
    performance: <CardSkeleton title="Performance" variant="chart" />,
    breakdown: <CardSkeleton title={config.breakdown.title} variant="chart" />,
    demographic: <CardSkeleton title="Demographic Comparison" variant="value" />,
    extra: isExpense ? <CardSkeleton title="Round-up" variant="value" /> : average,
  };

  return <CashflowLayout slots={() => slots} pairTotalOnMobile={isExpense} />;
}
