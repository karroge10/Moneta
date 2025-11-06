'use client';

import { useState } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import MobileNavbar from '@/components/MobileNavbar';
import UpdateCard from '@/components/dashboard/UpdateCard';
import UpcomingBillsCard from '@/components/dashboard/UpcomingBillsCard';
import LatestExpensesCard from '@/components/dashboard/LatestExpensesCard';
import PerformanceCard from '@/components/dashboard/PerformanceCard';
import TopCategoriesCard from '@/components/dashboard/TopCategoriesCard';
import DemographicComparisonCard from '@/components/dashboard/DemographicComparisonCard';
import InsightCard from '@/components/dashboard/InsightCard';
import IncomeCard from '@/components/dashboard/IncomeCard';
import AverageMonthlyCard from '@/components/dashboard/AverageMonthlyCard';
import TrendIndicator from '@/components/ui/TrendIndicator';
import { mockExpensesPage, mockBills } from '@/lib/mockData';
import { TimePeriod } from '@/types/dashboard';
import { formatNumber } from '@/lib/utils';

export default function ExpensesPage() {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('This Year');
  
  const data = mockExpensesPage;

  return (
    <main className="min-h-screen bg-[#202020]">
      {/* Desktop Header */}
      <div className="hidden md:block">
        <DashboardHeader 
          pageName="Expenses"
          timePeriod={timePeriod} 
          onTimePeriodChange={setTimePeriod}
          actionButton={{
            label: 'Add Expense',
            onClick: () => console.log('Add expense'),
          }}
        />
      </div>

      {/* Mobile Navbar */}
      <div className="md:hidden">
        <MobileNavbar 
          pageName="Expenses" 
          timePeriod={timePeriod} 
          onTimePeriodChange={setTimePeriod}
          activeSection="expenses"
        />
      </div>

      {/* Mobile: Custom Layout (< 768px) */}
      <div className="flex flex-col gap-4 px-4 pb-4 md:hidden">
        <UpdateCard
          date={data.update.date}
          message={data.update.message}
          highlight={data.update.highlight}
          link={data.update.link}
          linkHref="/transactions"
        />
        <div className="grid grid-cols-2 gap-4">
          <div className="card-surface flex flex-col px-6 py-4 rounded-[30px] gap-3">
            <h2 className="text-card-header">Total</h2>
            <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
              <span className="text-card-currency flex-shrink-0">$</span>
              <span className="text-card-value break-all min-w-0">{formatNumber(data.total.amount)}</span>
            </div>
            <TrendIndicator value={data.total.trend} label="from last year" />
          </div>
          <AverageMonthlyCard amount={data.averageMonthly.amount} trend={data.averageMonthly.trend} />
        </div>
        <UpcomingBillsCard bills={mockBills} />
        <LatestExpensesCard expenses={data.latestExpenses} />
        <PerformanceCard 
          trend={data.performance.trend}
          trendText={data.performance.trendText}
          data={data.performance.data}
        />
        <TopCategoriesCard categories={data.topCategories} />
        <DemographicComparisonCard
          message={data.demographicComparison.message}
          percentage={data.demographicComparison.percentage}
          percentageLabel={data.demographicComparison.percentageLabel}
          link={data.demographicComparison.link}
          linkHref="/statistics"
        />
        <InsightCard
          title={data.insight.title}
          amount={data.insight.amount}
          message={data.insight.message}
          investmentAmount={data.insight.investmentAmount}
          trend={data.insight.trend}
          shortRow
        />
      </div>

      {/* Two-column layout: 768px - 1536px */}
      <div className="hidden md:grid 2xl:hidden md:grid-cols-2 md:gap-4 md:px-6 md:pb-6">
        <UpdateCard
          date={data.update.date}
          message={data.update.message}
          highlight={data.update.highlight}
          link={data.update.link}
          linkHref="/transactions"
        />
        <div className="card-surface flex flex-col px-6 py-4 rounded-[30px] gap-3">
          <h2 className="text-card-header">Total</h2>
          <div className="flex items-baseline gap-2 flex-1 min-w-0 flex-wrap">
            <span className="text-card-currency flex-shrink-0">$</span>
            <span className="text-card-value break-all min-w-0">{formatNumber(data.total.amount)}</span>
          </div>
          <TrendIndicator value={data.total.trend} label="from last year" />
        </div>
        <AverageMonthlyCard amount={data.averageMonthly.amount} trend={data.averageMonthly.trend} />
        <UpcomingBillsCard bills={mockBills} />
        <LatestExpensesCard expenses={data.latestExpenses} />
        <PerformanceCard 
          trend={data.performance.trend}
          trendText={data.performance.trendText}
          data={data.performance.data}
        />
        <TopCategoriesCard categories={data.topCategories} />
        <DemographicComparisonCard
          message={data.demographicComparison.message}
          percentage={data.demographicComparison.percentage}
          percentageLabel={data.demographicComparison.percentageLabel}
          link={data.demographicComparison.link}
          linkHref="/statistics"
        />
        <InsightCard
          title={data.insight.title}
          amount={data.insight.amount}
          message={data.insight.message}
          investmentAmount={data.insight.investmentAmount}
          trend={data.insight.trend}
        />
      </div>

      {/* Desktop: Pure Tailwind Bento Grid (>= 1536px) */}
      <div className="hidden 2xl:grid 2xl:grid-cols-4 2xl:gap-4 2xl:px-6 2xl:pb-6">
        {/* Grid 1: Left side (3 columns) */}
        <div className="col-span-3 flex flex-col gap-4">
          {/* Row 1: Update, Total, Average Monthly - equal width */}
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
              <UpdateCard
                date={data.update.date}
                message={data.update.message}
                highlight={data.update.highlight}
                link={data.update.link}
                linkHref="/transactions"
              />
            </div>
            <div className="flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
              <div className="card-surface flex flex-col px-6 py-4 rounded-[30px] gap-3 h-full">
                <h2 className="text-card-header">Total</h2>
                <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
                  <span className="text-card-currency flex-shrink-0">$</span>
                  <span className="text-card-value break-all min-w-0">{formatNumber(data.total.amount)}</span>
                </div>
                <TrendIndicator value={data.total.trend} label="from last year" />
              </div>
            </div>
            <div className="flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
              <AverageMonthlyCard amount={data.averageMonthly.amount} trend={data.averageMonthly.trend} />
            </div>
          </div>

          {/* Row 2: Sub-bento grid */}
          <div className="grid grid-cols-5 gap-4">
            {/* Left column (3 cols): Latest Expenses + Demographic Comparison stacked */}
            <div className="col-span-3 flex flex-col gap-4">
              <div className="flex-[7] min-h-0 flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
                <LatestExpensesCard expenses={data.latestExpenses} />
              </div>
              <div className="min-h-0 flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
                <DemographicComparisonCard
                  message={data.demographicComparison.message}
                  percentage={data.demographicComparison.percentage}
                  percentageLabel={data.demographicComparison.percentageLabel}
                  link={data.demographicComparison.link}
                  linkHref="/statistics"
                />
              </div>
            </div>

            {/* Right column (2 cols): Performance + Insight */}
            <div className="col-span-2 flex flex-col gap-4">
              {/* Top row: Performance fills space */}
              <div className="flex-1 min-h-0 flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
                <PerformanceCard 
                  trend={data.performance.trend}
                  trendText={data.performance.trendText}
                  data={data.performance.data}
                />
              </div>
              
              {/* Bottom row: Insight */}
              <div className="min-h-0 flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
                <InsightCard
                  title={data.insight.title}
                  amount={data.insight.amount}
                  message={data.insight.message}
                  investmentAmount={data.insight.investmentAmount}
                  trend={data.insight.trend}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Grid 2: Right side (1 column) - Upcoming Bills + Top Categories */}
        <div className="col-span-1 flex flex-col gap-4">
          <div className="flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
            <UpcomingBillsCard bills={mockBills} />
          </div>
          <div className="flex-1 min-h-0 flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
            <TopCategoriesCard categories={data.topCategories} />
          </div>
        </div>
      </div>
    </main>
  );
}

