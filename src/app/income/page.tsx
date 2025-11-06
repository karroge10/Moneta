'use client';

import { useState } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import MobileNavbar from '@/components/MobileNavbar';
import UpdateCard from '@/components/dashboard/UpdateCard';
import UpcomingIncomesCard from '@/components/dashboard/UpcomingIncomesCard';
import LatestIncomesCard from '@/components/dashboard/LatestIncomesCard';
import PerformanceCard from '@/components/dashboard/PerformanceCard';
import TopSourcesCard from '@/components/dashboard/TopSourcesCard';
import DemographicComparisonCard from '@/components/dashboard/DemographicComparisonCard';
import AverageCard from '@/components/dashboard/AverageCard';
import EstimatedTaxCard from '@/components/dashboard/EstimatedTaxCard';
import TrendIndicator from '@/components/ui/TrendIndicator';
import { mockIncomePage } from '@/lib/mockData';
import { TimePeriod } from '@/types/dashboard';
import { formatNumber } from '@/lib/utils';

export default function IncomePage() {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('This Year');
  
  const data = mockIncomePage;

  return (
    <main className="min-h-screen bg-[#202020]">
      {/* Desktop Header */}
      <div className="hidden md:block">
        <DashboardHeader 
          pageName="Income"
          timePeriod={timePeriod} 
          onTimePeriodChange={setTimePeriod}
          actionButton={{
            label: 'Add Income',
            onClick: () => console.log('Add income'),
          }}
        />
      </div>

      {/* Mobile Navbar */}
      <div className="md:hidden">
        <MobileNavbar 
          pageName="Income" 
          timePeriod={timePeriod} 
          onTimePeriodChange={setTimePeriod}
          activeSection="income"
        />
      </div>

      {/* Mobile: Custom Layout (< 768px) */}
      <div className="flex flex-col gap-4 px-4 pb-4 md:hidden">
        <UpdateCard
          date={data.update.date}
          message={data.update.message}
          highlight={data.update.highlight}
          link={data.update.link}
          linkHref="/statistics"
        />
        <div className="card-surface flex flex-col px-6 py-4 rounded-[30px] gap-3">
          <h2 className="text-card-header">Total</h2>
          <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
            <span className="text-card-currency flex-shrink-0">$</span>
            <span className="text-card-value break-all min-w-0">{formatNumber(data.total.amount)}</span>
          </div>
          <TrendIndicator value={data.total.trend} label="from last year" />
        </div>
        <EstimatedTaxCard 
          amount={data.estimatedTax.amount}
          isEnabled={data.estimatedTax.isEnabled}
        />
        <UpcomingIncomesCard incomes={data.upcomingIncomes} />
        <LatestIncomesCard incomes={data.latestIncomes} />
        <PerformanceCard 
          trend={data.performance.trend}
          trendText={data.performance.trendText}
          data={data.performance.data}
        />
        <TopSourcesCard sources={data.topSources} />
        <DemographicComparisonCard
          message={data.demographicComparison.message}
          percentage={data.demographicComparison.percentage}
          percentageLabel={data.demographicComparison.percentageLabel}
          link={data.demographicComparison.link}
          linkHref="/statistics"
        />
        <AverageCard
          amount={data.average.amount}
          trend={data.average.trend}
          subtitle={data.average.subtitle}
        />
      </div>

      {/* Two-column layout: 768px - 1536px */}
      <div className="hidden md:grid 2xl:hidden md:grid-cols-2 md:gap-4 md:px-6 md:pb-6">
        <UpdateCard
          date={data.update.date}
          message={data.update.message}
          highlight={data.update.highlight}
          link={data.update.link}
          linkHref="/statistics"
        />
        <div className="card-surface flex flex-col px-6 py-4 rounded-[30px] gap-3">
          <h2 className="text-card-header">Total</h2>
          <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
            <span className="text-card-currency flex-shrink-0">$</span>
            <span className="text-card-value break-all min-w-0">{formatNumber(data.total.amount)}</span>
          </div>
          <TrendIndicator value={data.total.trend} label="from last year" />
        </div>
        <EstimatedTaxCard 
          amount={data.estimatedTax.amount}
          isEnabled={data.estimatedTax.isEnabled}
        />
        <UpcomingIncomesCard incomes={data.upcomingIncomes} />
        <LatestIncomesCard incomes={data.latestIncomes} />
        <PerformanceCard 
          trend={data.performance.trend}
          trendText={data.performance.trendText}
          data={data.performance.data}
        />
        <TopSourcesCard sources={data.topSources} />
        <DemographicComparisonCard
          message={data.demographicComparison.message}
          percentage={data.demographicComparison.percentage}
          percentageLabel={data.demographicComparison.percentageLabel}
          link={data.demographicComparison.link}
          linkHref="/statistics"
        />
        <AverageCard
          amount={data.average.amount}
          trend={data.average.trend}
          subtitle={data.average.subtitle}
        />
      </div>

      {/* Desktop: Pure Tailwind Bento Grid (>= 1536px) */}
      <div className="hidden 2xl:grid 2xl:grid-cols-4 2xl:gap-4 2xl:px-6 2xl:pb-6">
        {/* Grid 1: Left side (3 columns) */}
        <div className="col-span-3 flex flex-col gap-4">
          {/* Row 1: Update, Total, Estimated Tax - equal width */}
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
              <UpdateCard
                date={data.update.date}
                message={data.update.message}
                highlight={data.update.highlight}
                link={data.update.link}
                linkHref="/statistics"
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
              <EstimatedTaxCard 
                amount={data.estimatedTax.amount}
                isEnabled={data.estimatedTax.isEnabled}
              />
            </div>
          </div>

          {/* Row 2: Sub-bento grid */}
          <div className="grid grid-cols-5 gap-4">
            {/* Left column (3 cols): Latest Incomes + Demographic Comparison stacked */}
            <div className="col-span-3 flex flex-col gap-4">
              <div className="flex-[7] min-h-0 flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
                <LatestIncomesCard incomes={data.latestIncomes} />
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

            {/* Right column (2 cols): Performance + Average */}
            <div className="col-span-2 flex flex-col gap-4">
              {/* Top row: Performance fills space */}
              <div className="flex-1 min-h-0 flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
                <PerformanceCard 
                  trend={data.performance.trend}
                  trendText={data.performance.trendText}
                  data={data.performance.data}
                />
              </div>
              
              {/* Bottom row: Average */}
              <div className="min-h-0 flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
                <AverageCard
                  amount={data.average.amount}
                  trend={data.average.trend}
                  subtitle={data.average.subtitle}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Grid 2: Right side (1 column) - Upcoming Incomes + Top Sources */}
        <div className="col-span-1 flex flex-col gap-4">
          <div className="flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
            <UpcomingIncomesCard incomes={data.upcomingIncomes} />
          </div>
          <div className="flex-1 min-h-0 flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
            <TopSourcesCard sources={data.topSources} />
          </div>
        </div>
      </div>
    </main>
  );
}

