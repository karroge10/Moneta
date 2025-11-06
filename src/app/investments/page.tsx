'use client';

import { useState } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import MobileNavbar from '@/components/MobileNavbar';
import UpdateCard from '@/components/dashboard/UpdateCard';
import BalanceCard from '@/components/dashboard/BalanceCard';
import PortfolioCard from '@/components/dashboard/PortfolioCard';
import PerformanceCardNoPadding from '@/components/dashboard/PerformanceCardNoPadding';
import RecentActivitiesCard from '@/components/dashboard/RecentActivitiesCard';
import { mockInvestmentsPage } from '@/lib/mockData';
import { TimePeriod } from '@/types/dashboard';

export default function InvestmentsPage() {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('All Time');
  
  const data = mockInvestmentsPage;

  return (
    <main className="min-h-screen bg-[#202020]">
      {/* Desktop Header */}
      <div className="hidden md:block">
        <DashboardHeader 
          pageName="Investments"
          timePeriod={timePeriod} 
          onTimePeriodChange={setTimePeriod}
          actionButton={{
            label: 'Add Investment',
            onClick: () => console.log('Add investment'),
          }}
        />
      </div>

      {/* Mobile Navbar */}
      <div className="md:hidden">
        <MobileNavbar 
          pageName="Investments" 
          timePeriod={timePeriod} 
          onTimePeriodChange={setTimePeriod}
          activeSection="investments"
        />
      </div>

      {/* Mobile: Custom Layout (< 768px) */}
      <div className="flex flex-col gap-4 px-4 pb-4 md:hidden">
        {/* Update and Balance side by side */}
        <div className="grid grid-cols-2 gap-4">
          <UpdateCard
            date={data.update.date}
            message={data.update.message}
            highlight={data.update.highlight}
            link={data.update.link}
            linkHref="/statistics"
          />
          <BalanceCard amount={data.balance.amount} trend={data.balance.trend} />
        </div>
        <PortfolioCard investments={data.portfolio} />
        <PerformanceCardNoPadding 
          trend={data.performance.trend}
          trendText={data.performance.trendText}
          data={data.performance.data}
        />
        <RecentActivitiesCard activities={data.recentActivities} />
      </div>

      {/* Two-column layout: 768px - 1535px */}
      <div className="hidden md:grid 2xl:hidden md:grid-cols-2 md:gap-4 md:px-6 md:pb-6">
        {/* Update and Balance side by side */}
        <div className="grid grid-cols-2 gap-4 col-span-2">
          <UpdateCard
            date={data.update.date}
            message={data.update.message}
            highlight={data.update.highlight}
            link={data.update.link}
            linkHref="/statistics"
          />
          <BalanceCard amount={data.balance.amount} trend={data.balance.trend} />
        </div>
        <PortfolioCard investments={data.portfolio} />
        <PerformanceCardNoPadding 
          trend={data.performance.trend}
          trendText={data.performance.trendText}
          data={data.performance.data}
        />
        <div className="col-span-2">
          <RecentActivitiesCard activities={data.recentActivities} />
        </div>
      </div>

      {/* Desktop: 2-column layout with 50/50 split (>= 1536px) */}
      <div className="hidden 2xl:grid 2xl:grid-cols-2 2xl:gap-4 2xl:px-6 2xl:pb-6">
        {/* Left column (50%) */}
        <div className="flex flex-col gap-4">
          {/* Row 1: Update and Balance side by side */}
          <div className="grid grid-cols-2 gap-4">
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
              <BalanceCard amount={data.balance.amount} trend={data.balance.trend} />
            </div>
          </div>
          <div className="flex-1 min-h-0 flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
            <PortfolioCard investments={data.portfolio} />
          </div>
        </div>

        {/* Right column (50%) */}
        <div className="flex flex-col gap-4">
          <div className="flex-1 min-h-0 flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
            <PerformanceCardNoPadding 
              trend={data.performance.trend}
              trendText={data.performance.trendText}
              data={data.performance.data}
            />
          </div>
          <div className="flex-1 min-h-0 flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
            <RecentActivitiesCard activities={data.recentActivities} />
          </div>
        </div>
      </div>
    </main>
  );
}

