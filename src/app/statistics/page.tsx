'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import MobileNavbar from '@/components/MobileNavbar';
import FinancialMilestonesCard from '@/components/statistics/FinancialMilestonesCard';
import DemographicComparisonsSection from '@/components/statistics/DemographicComparisonsSection';
import AverageExpensesCard from '@/components/statistics/AverageExpensesCard';
import MonthlySummaryTable from '@/components/statistics/MonthlySummaryTable';
import StatisticsSummary from '@/components/statistics/StatisticsSummary';
import { mockStatisticsPage } from '@/lib/mockData';
import { MonthlySummaryRow, StatisticsSummaryItem, DemographicComparison } from '@/types/dashboard';

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
    } catch (err) {
      console.error('Error fetching statistics data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load statistics data');
      setMonthlySummary([]);
      setAverageExpenses([]);
      setSummaryItems([]);
      setDemographicComparisons([]);
      setDemographicComparisonsDisabled(false);
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
        />
      </div>

      {/* Tablet/Desktop: top row (3 cols) + bottom row (full-width table) */}
      <div className="hidden md:flex flex-col gap-4 md:px-6 md:pb-6 min-h-[calc(100vh-120px)]">
        {/* Top row: Milestones+Demographic | Average Expenses | Summary — equal height columns */}
        <div className="grid md:grid-cols-[1fr_1.2fr_1fr] 2xl:grid-cols-[1fr_1.3fr_1fr] md:grid-rows-1 gap-4 min-h-[600px] shrink-0 items-stretch">
          <div className="flex flex-col gap-4 min-h-0 h-full">
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
          <div className="flex flex-col min-h-0 min-w-0 h-full">
            <AverageExpensesCard
              expenses={averageExpenses}
              loading={loadingPersonal}
              error={error}
              onRetry={fetchFull}
            />
          </div>
          <div className="flex flex-col min-h-0 min-w-0 h-full">
            <StatisticsSummary
              items={summaryItemsToShow}
              loading={loadingPersonal || !!error}
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
    </main>
  );
}

