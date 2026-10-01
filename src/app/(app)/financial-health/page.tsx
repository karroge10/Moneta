'use client';

import DashboardHeader from '@/components/DashboardHeader';
import MobileNavbar from '@/components/MobileNavbar';
import Skeleton from '@/components/ui/Skeleton';
import ErrorState from '@/components/ui/ErrorState';
import FinancialHealthBreakdown from '@/components/dashboard/FinancialHealthBreakdown';
import { getHealthColor } from '@/lib/utils';
import { formatDecimal } from '@/lib/format';
import { useFinancialHealth } from '@/hooks/useFinancialHealth';

export default function FinancialHealthPage() {
  const health = useFinancialHealth();
  const data = health.data;
  const score = data?.score ?? 0;

  return (
    <main className="min-h-screen bg-background">
      <div className="hidden md:block">
        <DashboardHeader pageName="Financial Health" />
      </div>
      <div className="md:hidden">
        <MobileNavbar pageName="Financial Health" activeSection="dashboard" />
      </div>

      <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 pb-6 pt-4 md:px-6">
        {health.isPending && (
          <div className="card-surface flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-card p-8" aria-busy="true">
            <Skeleton className="size-12 rounded-full" />
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        )}

        {health.isError && (
          <div className="card-surface rounded-card">
            <ErrorState message={health.error.message} onRetry={() => health.refetch()} retrying={health.isFetching} />
          </div>
        )}

        {data && (
          <>
            <div className="card-surface flex flex-col items-center rounded-card p-8">
              <h1 className="mb-2 text-heading font-semibold">Financial Health Score</h1>
              <p className="mb-4 text-center text-ui text-secondary">
                Based on your full history (all time), not the period selector used elsewhere.
              </p>
              <span className="text-fin-health-key tabular-nums" style={{ color: getHealthColor(score) }}>
                {formatDecimal(score, { maxDecimals: 0 })}
              </span>
            </div>

            <div className="card-surface rounded-card p-6">
              <h2 className="mb-3 text-heading font-semibold">How we calculate your score</h2>
              <p className="mb-6 text-copy text-secondary">
                Your Financial Health Score is based on four areas: Saving, Spending control, Goals, and Engagement.
              </p>
              <FinancialHealthBreakdown details={data.details} isEmpty={score === 0} />
            </div>
          </>
        )}
      </div>
    </main>
  );
}
