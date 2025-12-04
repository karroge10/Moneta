'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import MobileNavbar from '@/components/MobileNavbar';
import FinancialMilestonesCard from '@/components/statistics/FinancialMilestonesCard';
import DemographicComparisonsSection from '@/components/statistics/DemographicComparisonsSection';
import AverageExpensesCard from '@/components/statistics/AverageExpensesCard';
import MonthlySummaryTable from '@/components/statistics/MonthlySummaryTable';
import StatisticsSummary from '@/components/statistics/StatisticsSummary';
import CardSkeleton from '@/components/dashboard/CardSkeleton';
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

  // Render skeleton layout during loading
  if (loading) {
    return (
      <main className="min-h-screen bg-[#202020]">
        {/* Desktop Header */}
        <div className="hidden md:block">
          <DashboardHeader 
            pageName="Statistics"
          />
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

        {/* Content - 3 Column Layout with Skeletons */}
        <div className="flex flex-col md:grid md:grid-cols-[1fr_1.2fr_1fr] 2xl:grid-cols-[1fr_1.3fr_1fr] gap-4 px-4 md:px-6 pb-6">
          {/* Left Column */}
          <div className="flex flex-col gap-4 min-h-0">
            <CardSkeleton title="Financial Milestones" variant="list" />
            <CardSkeleton title="Demographic Comparisons" variant="list" />
          </div>

          {/* Middle Column */}
          <div className="flex flex-col gap-4 min-h-0">
            <CardSkeleton title="Average Expenses" variant="list" />
            <CardSkeleton title="Monthly Summary" variant="list" />
          </div>

          {/* Right Column */}
          <div className="min-h-0">
            <CardSkeleton title="Summary" variant="list" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#202020]">
      {/* Desktop Header */}
      <div className="hidden md:block">
        <DashboardHeader 
          pageName="Statistics"
        />
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

      {/* Content - 3 Column Layout */}
      <div className="flex flex-col md:grid md:grid-cols-[1fr_1.2fr_1fr] 2xl:grid-cols-[1fr_1.3fr_1fr] gap-4 px-4 md:px-6 pb-6">
        {/* Left Column */}
        <div className="flex flex-col gap-4 min-h-0">
          <FinancialMilestonesCard milestone={mockStatisticsPage.milestone} />
          <DemographicComparisonsSection comparisons={mockStatisticsPage.demographicComparisons} />
        </div>

        {/* Middle Column - Slightly Bigger */}
        <div className="flex flex-col gap-4 min-h-0">
          <AverageExpensesCard expenses={averageExpenses} />
          <MonthlySummaryTable data={monthlySummary} />
        </div>

        {/* Right Column */}
        <div className="min-h-0">
          <StatisticsSummary items={summaryItems.length > 0 ? summaryItems : (error ? mockStatisticsPage.summary.items : [])} />
        </div>
      </div>
    </main>
  );
}

