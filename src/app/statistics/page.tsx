'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import MobileNavbar from '@/components/MobileNavbar';
import FinancialMilestonesCard from '@/components/statistics/FinancialMilestonesCard';
import DemographicComparisonsSection from '@/components/statistics/DemographicComparisonsSection';
import AverageExpensesCard from '@/components/statistics/AverageExpensesCard';
import MonthlySummaryTable from '@/components/statistics/MonthlySummaryTable';
import StatisticsSummary from '@/components/statistics/StatisticsSummary';
import { mockStatisticsPage } from '@/lib/mockData';
import { TimePeriod, MonthlySummaryRow, StatisticsSummaryItem } from '@/types/dashboard';

interface AverageExpense {
  id: string;
  name: string;
  amount: number;
  icon: string;
  color: string;
  percentage?: number;
}

export default function StatisticsPage() {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('All Time');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummaryRow[]>([]);
  const [averageExpenses, setAverageExpenses] = useState<AverageExpense[]>([]);
  const [summaryItems, setSummaryItems] = useState<StatisticsSummaryItem[]>([]);

  const fetchStatisticsData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ timePeriod });
      const response = await fetch(`/api/statistics?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch statistics data');
      }
      
      const data = await response.json();
      setMonthlySummary(data.monthlySummary || []);
      setAverageExpenses(data.averageExpenses || []);
      setSummaryItems(data.summary?.items || []);
    } catch (err) {
      console.error('Error fetching statistics data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load statistics data');
      setMonthlySummary([]);
      setAverageExpenses([]);
      setSummaryItems([]);
    } finally {
      setLoading(false);
    }
  }, [timePeriod]);

  useEffect(() => {
    fetchStatisticsData();
  }, [fetchStatisticsData]);

  const summaryItemsToShow = summaryItems.length > 0 ? summaryItems : (error ? mockStatisticsPage.summary.items : []);

  return (
    <main className="min-h-screen bg-[#202020]">
      {/* Desktop Header */}
      <div className="hidden md:block">
        <DashboardHeader pageName="Statistics" />
      </div>

      {/* Mobile Navbar */}
      <div className="md:hidden">
        <MobileNavbar
          pageName="Statistics"
          timePeriod={timePeriod}
          onTimePeriodChange={setTimePeriod}
          activeSection="statistics"
        />
      </div>

      {/* Content — same layout when loading; cards show skeleton internally */}
      {/* Mobile: stacked */}
      <div className="md:hidden flex flex-col gap-4 px-4 pb-4">
        <FinancialMilestonesCard
          milestone={mockStatisticsPage.milestone}
          loading={loading || !!error}
        />
        <DemographicComparisonsSection
          comparisons={mockStatisticsPage.demographicComparisons}
          loading={loading || !!error}
        />
        <AverageExpensesCard
          expenses={averageExpenses}
          loading={loading}
          error={error}
          onRetry={fetchStatisticsData}
        />
        <MonthlySummaryTable
          data={monthlySummary}
          loading={loading}
          error={error}
          onRetry={fetchStatisticsData}
        />
        <StatisticsSummary
          items={summaryItemsToShow}
          loading={loading || !!error}
        />
      </div>

      {/* Tablet/Desktop: top row (3 cols) + bottom row (full-width table) */}
      <div className="hidden md:flex flex-col gap-4 md:px-6 md:pb-6 min-h-[calc(100vh-120px)]">
        {/* Top row: Milestones+Demographic | Average Expenses | Summary — equal height columns */}
        <div className="grid md:grid-cols-[1fr_1.2fr_1fr] 2xl:grid-cols-[1fr_1.3fr_1fr] md:grid-rows-1 gap-4 min-h-[600px] shrink-0 items-stretch">
          <div className="flex flex-col gap-4 min-h-0 h-full">
            <FinancialMilestonesCard
              milestone={mockStatisticsPage.milestone}
              loading={loading || !!error}
            />
            <DemographicComparisonsSection
              comparisons={mockStatisticsPage.demographicComparisons}
              loading={loading || !!error}
            />
          </div>
          <div className="flex flex-col min-h-0 min-w-0 h-full">
            <AverageExpensesCard
          expenses={averageExpenses}
          loading={loading}
          error={error}
          onRetry={fetchStatisticsData}
        />
          </div>
          <div className="flex flex-col min-h-0 min-w-0 h-full">
            <StatisticsSummary
            items={summaryItemsToShow}
            loading={loading || !!error}
          />
          </div>
        </div>

        {/* Bottom row: Monthly Summary — full width */}
        <div className="flex-1 flex flex-col min-h-[320px]">
          <MonthlySummaryTable
          data={monthlySummary}
          loading={loading}
          error={error}
          onRetry={fetchStatisticsData}
        />
        </div>
      </div>
    </main>
  );
}

