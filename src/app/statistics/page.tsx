'use client';

import { useState } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import MobileNavbar from '@/components/MobileNavbar';
import FinancialMilestonesCard from '@/components/statistics/FinancialMilestonesCard';
import DemographicComparisonsSection from '@/components/statistics/DemographicComparisonsSection';
import AverageExpensesCard from '@/components/statistics/AverageExpensesCard';
import MonthlySummaryTable from '@/components/statistics/MonthlySummaryTable';
import StatisticsSummary from '@/components/statistics/StatisticsSummary';
import { mockStatisticsPage } from '@/lib/mockData';
import { TimePeriod } from '@/types/dashboard';

export default function StatisticsPage() {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('All Time');

  return (
    <main className="min-h-screen bg-[#202020]">
      {/* Desktop Header */}
      <div className="hidden md:block">
        <DashboardHeader 
          pageName="Statistics"
          timePeriod={timePeriod} 
          onTimePeriodChange={setTimePeriod}
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
          <AverageExpensesCard expenses={mockStatisticsPage.averageExpenses} />
          <MonthlySummaryTable data={mockStatisticsPage.monthlySummary} />
        </div>

        {/* Right Column */}
        <div className="min-h-0">
          <StatisticsSummary items={mockStatisticsPage.summary.items} />
        </div>
      </div>
    </main>
  );
}

