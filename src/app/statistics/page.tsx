'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import MobileNavbar from '@/components/MobileNavbar';
import FinancialMilestonesCard from '@/components/statistics/FinancialMilestonesCard';
import DemographicComparisonsSection from '@/components/statistics/DemographicComparisonsSection';
import AverageExpensesCard from '@/components/statistics/AverageExpensesCard';
import MonthlySummaryTable from '@/components/statistics/MonthlySummaryTable';
import StatisticsSummary from '@/components/statistics/StatisticsSummary';
import FinancialHealthModal from '@/components/dashboard/FinancialHealthModal';
import { mockStatisticsPage } from '@/lib/mockData';
import { MonthlySummaryRow, StatisticsSummaryItem, DemographicComparison, FinancialHealthDetails } from '@/types/dashboard';

/** Statistics always use All Time; no period selector. */
const STATISTICS_TIME_PERIOD = 'All Time';

interface AverageExpense {
  id: string;
  name: string;
  amount: number;
  icon: string;
  color: string;
  percentage?: number;
}

export type DemographicDimension = 'age' | 'country' | 'profession';

export default function StatisticsPage() {
  const [demographicDimension, setDemographicDimension] = useState<DemographicDimension>('age');
  const [loadingPersonal, setLoadingPersonal] = useState(true);
  const [loadingDemographic, setLoadingDemographic] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demographicError, setDemographicError] = useState<string | null>(null);
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummaryRow[]>([]);
  const [averageExpenses, setAverageExpenses] = useState<AverageExpense[]>([]);
  const [summaryItems, setSummaryItems] = useState<StatisticsSummaryItem[]>([]);
  const [demographicComparisons, setDemographicComparisons] = useState<DemographicComparison[]>([]);
  const [demographicComparisonsDisabled, setDemographicComparisonsDisabled] = useState(false);
  const [demographicCohortValueMissing, setDemographicCohortValueMissing] = useState(false);
  const [financialHealthDetails, setFinancialHealthDetails] = useState<FinancialHealthDetails | null>(null);
  const [financialHealthModalOpen, setFinancialHealthModalOpen] = useState(false);
  const prevDimensionRef = useRef<DemographicDimension | null>(null);

  const fetchFull = useCallback(async () => {
    try {
      setLoadingPersonal(true);
      setError(null);
      setDemographicError(null);
      const params = new URLSearchParams({ timePeriod: STATISTICS_TIME_PERIOD, demographicDimension });
      const response = await fetch(`/api/statistics?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch statistics data');
      const data = await response.json();
      setMonthlySummary(data.monthlySummary || []);
      setAverageExpenses(data.averageExpenses || []);
      setSummaryItems(data.summary?.items || []);
      setDemographicComparisons(data.demographicComparisons ?? []);
      setDemographicComparisonsDisabled(data.demographicComparisonsDisabled === true);
      setDemographicCohortValueMissing(data.demographicCohortValueMissing === true);
      setFinancialHealthDetails(
        data.financialHealth != null
          ? {
              score: data.financialHealth.score ?? 0,
              trend: data.financialHealth.trend ?? 0,
              details: data.financialHealth.details ?? { saving: 0, spendingControl: 0, goals: 0, engagement: 0 },
            }
          : null
      );
    } catch (err) {
      console.error('Error fetching statistics data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load statistics data');
      setMonthlySummary([]);
      setAverageExpenses([]);
      setSummaryItems([]);
      setDemographicComparisons([]);
      setDemographicComparisonsDisabled(false);
      setFinancialHealthDetails(null);
    } finally {
      setLoadingPersonal(false);
    }
  }, [demographicDimension]);

  const fetchDemographicOnly = useCallback(async () => {
    try {
      setLoadingDemographic(true);
      setDemographicError(null);
      const params = new URLSearchParams({
        timePeriod: STATISTICS_TIME_PERIOD,
        demographicDimension,
        demographicOnly: '1',
      });
      const response = await fetch(`/api/statistics?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch demographic data');
      const data = await response.json();
      setDemographicComparisons(data.demographicComparisons ?? []);
      setDemographicComparisonsDisabled(data.demographicComparisonsDisabled === true);
      setDemographicCohortValueMissing(data.demographicCohortValueMissing === true);
    } catch (err) {
      console.error('Error fetching demographic data:', err);
      setDemographicError(err instanceof Error ? err.message : 'Failed to load demographic data');
      setDemographicComparisons([]);
      setDemographicComparisonsDisabled(false);
    } finally {
      setLoadingDemographic(false);
    }
  }, [demographicDimension]);

  useEffect(() => {
    const isInitial = prevDimensionRef.current === null;
    const dimensionChanged = prevDimensionRef.current !== demographicDimension;
    prevDimensionRef.current = demographicDimension;
    if (isInitial) {
      fetchFull();
    } else if (dimensionChanged) {
      fetchDemographicOnly();
    }
  }, [demographicDimension, fetchFull, fetchDemographicOnly]);

  const summaryItemsToShow = summaryItems.length > 0 ? summaryItems : (error ? mockStatisticsPage.summary.items : []);

  return (
    <main className="min-h-screen bg-[#202020]">
      {/* Desktop Header */}
      <div className="hidden md:block">
        <DashboardHeader pageName="Statistics" />
      </div>

      {/* Mobile Navbar — no time period selector; statistics are always All Time */}
      <div className="md:hidden">
        <MobileNavbar pageName="Statistics" activeSection="statistics" />
      </div>

      {/* Content — same layout when loading; cards show skeleton internally */}
      {/* Mobile: stacked */}
      <div className="md:hidden flex flex-col gap-4 px-4 pb-4">
        <FinancialMilestonesCard
          milestone={mockStatisticsPage.milestone}
          loading={loadingPersonal || !!error}
        />
        <DemographicComparisonsSection
          comparisons={demographicComparisons}
          loading={loadingDemographic || (loadingPersonal || !!error)}
          demographicComparisonsDisabled={demographicComparisonsDisabled}
          demographicCohortValueMissing={demographicCohortValueMissing}
          demographicDimension={demographicDimension}
          onDemographicChange={setDemographicDimension}
          error={demographicError}
          onRetry={fetchDemographicOnly}
        />
        <AverageExpensesCard
          expenses={averageExpenses}
          loading={loadingPersonal}
          error={error}
          onRetry={fetchFull}
        />
        <MonthlySummaryTable
          data={monthlySummary}
          loading={loadingPersonal}
          error={error}
          onRetry={fetchFull}
        />
        <StatisticsSummary
          items={summaryItemsToShow}
          loading={loadingPersonal || !!error}
          onFinancialHealthLearnClick={() => setFinancialHealthModalOpen(true)}
        />
      </div>

      {/* Tablet/Desktop: top row (2 cols below 2xl, 3 cols at 2xl) + bottom row (full-width table) */}
      <div className="hidden md:flex flex-col gap-4 md:px-6 md:pb-6 min-h-[calc(100vh-120px)]">
        {/* Top row: fixed height so Expenses list cuts off at container; left column and Demographic list scroll if needed */}
        <div className="grid md:grid-cols-2 2xl:grid-cols-[1fr_1.3fr_1fr] md:grid-rows-1 gap-4 h-[900px] min-h-[900px] max-h-[900px] shrink-0 items-stretch overflow-hidden">
          <div className="flex flex-col gap-4 min-h-0 h-full overflow-y-auto custom-scrollbar pr-1">
            <FinancialMilestonesCard
              milestone={mockStatisticsPage.milestone}
              loading={loadingPersonal || !!error}
            />
            <DemographicComparisonsSection
              comparisons={demographicComparisons}
              loading={loadingDemographic || (loadingPersonal || !!error)}
              demographicComparisonsDisabled={demographicComparisonsDisabled}
              demographicCohortValueMissing={demographicCohortValueMissing}
              demographicDimension={demographicDimension}
              onDemographicChange={setDemographicDimension}
              error={demographicError}
              onRetry={fetchDemographicOnly}
            />
          </div>
          <div className="flex flex-col min-h-0 min-w-0 h-full overflow-hidden">
            <AverageExpensesCard
              expenses={averageExpenses}
              loading={loadingPersonal}
              error={error}
              onRetry={fetchFull}
            />
          </div>
          <div className="flex flex-col min-h-0 min-w-0 h-full md:col-span-2 2xl:col-span-1">
            <StatisticsSummary
              items={summaryItemsToShow}
              loading={loadingPersonal || !!error}
              onFinancialHealthLearnClick={() => setFinancialHealthModalOpen(true)}
            />
          </div>
        </div>

        {/* Bottom row: Monthly Summary — full width */}
        <div className="flex-1 flex flex-col min-h-[320px]">
          <MonthlySummaryTable
            data={monthlySummary}
            loading={loadingPersonal}
            error={error}
            onRetry={fetchFull}
          />
        </div>
      </div>

      <FinancialHealthModal
        isOpen={financialHealthModalOpen}
        onClose={() => setFinancialHealthModalOpen(false)}
        timePeriod={STATISTICS_TIME_PERIOD}
        initialData={financialHealthDetails}
      />
    </main>
  );
}

