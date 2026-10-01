'use client';

import { useState } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import MobileNavbar from '@/components/MobileNavbar';
import DemographicComparisonsSection from '@/components/statistics/DemographicComparisonsSection';
import AverageExpensesCard from '@/components/statistics/AverageExpensesCard';
import MonthlySummaryTable from '@/components/statistics/MonthlySummaryTable';
import StatisticsSummary from '@/components/statistics/StatisticsSummary';
import FinancialHealthModal from '@/components/dashboard/FinancialHealthModal';
import type { DemographicDimension } from '@/lib/statistics/cohort';
import { useStatisticsData } from '@/hooks/useStatisticsData';

export default function StatisticsPage() {
  const [dimension, setDimension] = useState<DemographicDimension>('age');
  const [healthModalOpen, setHealthModalOpen] = useState(false);
  const { summary, demographic } = useStatisticsData(dimension);

  const data = summary.data;
  const loading = summary.isPending;
  const error = summary.error?.message ?? null;
  const retry = () => void summary.refetch();
  const openHealthModal = () => setHealthModalOpen(true);

  const demographicSection = (
    <DemographicComparisonsSection
      section={demographic.data}
      loading={demographic.isPending}
      dimension={dimension}
      onDimensionChange={setDimension}
      error={demographic.error?.message ?? null}
      onRetry={() => void demographic.refetch()}
    />
  );
  const averageExpenses = (
    <AverageExpensesCard expenses={data?.averageExpenses ?? []} loading={loading} error={error} onRetry={retry} />
  );
  const monthlySummary = (
    <MonthlySummaryTable data={data?.monthlySummary ?? []} loading={loading} error={error} onRetry={retry} />
  );
  const statisticsSummary = (
    <StatisticsSummary
      items={data?.summaryItems ?? []}
      missingRates={data?.missingRates ?? 0}
      loading={loading}
      error={error}
      onRetry={retry}
      onFinancialHealthLearnClick={openHealthModal}
    />
  );

  return (
    <main className="min-h-screen bg-background">
      <div className="hidden md:block">
        <DashboardHeader pageName="Statistics" />
      </div>
      <div className="md:hidden">
        <MobileNavbar pageName="Statistics" activeSection="statistics" />
      </div>

      <div className="flex flex-col gap-4 px-4 pb-4 md:hidden">
        {demographicSection}
        {averageExpenses}
        {monthlySummary}
        {statisticsSummary}
      </div>

      <div className="hidden min-h-[calc(100vh-120px)] flex-col gap-4 md:flex md:px-6 md:pb-6">
        <div className="grid shrink-0 items-stretch gap-4 md:grid-cols-2 2xl:h-[900px] 2xl:grid-cols-[1fr_1.3fr_1fr] 2xl:grid-rows-1">
          <div className="flex h-full min-h-0 flex-col gap-4 pr-1">{demographicSection}</div>
          <div className="flex h-full min-h-0 min-w-0 flex-col">{averageExpenses}</div>
          <div className="flex h-full min-h-0 min-w-0 flex-col md:col-span-2 2xl:col-span-1">{statisticsSummary}</div>
        </div>
        <div className="flex min-h-[320px] flex-1 flex-col">{monthlySummary}</div>
      </div>

      <FinancialHealthModal
        isOpen={healthModalOpen}
        onClose={() => setHealthModalOpen(false)}
        initialData={data?.financialHealth}
      />
    </main>
  );
}
