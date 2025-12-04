'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import MobileNavbar from '@/components/MobileNavbar';
import UpdateCard from '@/components/dashboard/UpdateCard';
import UpcomingBillsCard from '@/components/dashboard/UpcomingBillsCard';
import LatestExpensesCard from '@/components/dashboard/LatestExpensesCard';
import PerformanceCard from '@/components/dashboard/PerformanceCard';
import TopCategoriesCard from '@/components/dashboard/TopCategoriesCard';
import DemographicComparisonCard from '@/components/dashboard/DemographicComparisonCard';
import InsightCard from '@/components/dashboard/InsightCard';
import AverageMonthlyCard from '@/components/dashboard/AverageMonthlyCard';
import AverageDailyCard from '@/components/dashboard/AverageDailyCard';
import CardSkeleton from '@/components/dashboard/CardSkeleton';
import TrendIndicator from '@/components/ui/TrendIndicator';
import { mockExpensesPage, mockBills } from '@/lib/mockData';
import { TimePeriod, LatestExpense, ExpenseCategory, PerformanceDataPoint } from '@/types/dashboard';
import { formatNumber } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';

export default function ExpensesPage() {
  const { currency } = useCurrency();
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('This Year');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState({ amount: 0, trend: 0 });
  const [topCategories, setTopCategories] = useState<ExpenseCategory[]>([]);
  const [latestExpenses, setLatestExpenses] = useState<LatestExpense[]>([]);
  const [performance, setPerformance] = useState<{ trend: number; trendText: string; data: PerformanceDataPoint[] }>({
    trend: 0,
    trendText: '',
    data: [],
  });
  const [averageMonthly, setAverageMonthly] = useState({ amount: 0, trend: 0 });
  const [averageDaily, setAverageDaily] = useState<{ amount: number; trend: number } | null>(null);
  const [nextMonthPrediction, setNextMonthPrediction] = useState<number | null>(null);
  
  // Keep mock data for components not requested to be changed
  const update = mockExpensesPage.update;
  const insight = mockExpensesPage.insight;
  const demographicComparison = mockExpensesPage.demographicComparison;
  
  const fetchExpensesData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ timePeriod });
      const response = await fetch(`/api/expenses?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch expenses data');
      }
      
      const data = await response.json();
      setTotal({
        amount: data.total?.amount || 0,
        trend: data.total?.trend || 0,
      });
      setTopCategories(data.topCategories || []);
      setLatestExpenses(data.latestExpenses || []);
      setPerformance({
        trend: data.performance?.trend || 0,
        trendText: data.performance?.trendText || '',
        data: data.performance?.data || [],
      });
      setAverageMonthly({
        amount: data.averageMonthly?.amount || 0,
        trend: data.averageMonthly?.trend || 0,
      });
      setAverageDaily(data.averageDaily ?? null);
      setNextMonthPrediction(data.nextMonthPrediction ?? null);
    } catch (err) {
      console.error('Error fetching expenses data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load expenses data');
      setTotal({ amount: 0, trend: 0 });
      setTopCategories([]);
      setLatestExpenses([]);
      setPerformance({ trend: 0, trendText: '', data: [] });
      setAverageMonthly({ amount: 0, trend: 0 });
      setAverageDaily(null);
      setNextMonthPrediction(null);
    } finally {
      setLoading(false);
    }
  }, [timePeriod]);

  useEffect(() => {
    fetchExpensesData();
  }, [fetchExpensesData]);

  // Helper to get comparison label based on time period
  const getComparisonLabel = (period: TimePeriod): string => {
    switch (period) {
      case 'This Month':
        return 'from last month';
      case 'Last Month':
        return 'from 2 months ago';
      case 'This Quarter':
        return 'from last quarter';
      case 'Last Quarter':
        return 'from 2 quarters ago';
      case 'This Year':
        return 'from last year';
      case 'Last Year':
        return 'from 2 years ago';
      case 'All Time':
        return '';
      default:
        return '';
    }
  };

  // Helper to get card title based on time period
  const getAverageCardTitle = (): string => {
    if (timePeriod === 'This Month' || timePeriod === 'Last Month') return 'Average Daily';
    return 'Average Monthly';
  };

  // Helper to render skeleton layout
  const renderSkeletonLayout = () => (
    <>
      {/* Mobile: Custom Layout (< 768px) */}
      <div className="flex flex-col gap-4 px-4 pb-4 md:hidden">
        <CardSkeleton title="Update" variant="update" />
        <div className="grid grid-cols-2 gap-4">
          <CardSkeleton title="Total" variant="value" />
          <CardSkeleton title={getAverageCardTitle()} variant="value" />
        </div>
        <CardSkeleton title="Upcoming Bills" variant="list" />
        <CardSkeleton title="Latest Expenses" variant="list" />
        <CardSkeleton title="Performance" variant="chart" />
        <CardSkeleton title="Top Categories" variant="chart" />
        <CardSkeleton title="Demographic Comparison" variant="value" />
        <CardSkeleton title="Insight" variant="value" />
      </div>

      {/* Two-column layout: 768px - 1536px */}
      <div className="hidden md:grid 2xl:hidden md:grid-cols-2 md:gap-4 md:px-6 md:pb-6">
        <CardSkeleton title="Update" variant="update" />
        <CardSkeleton title="Total" variant="value" />
        <CardSkeleton title={getAverageCardTitle()} variant="value" />
        <CardSkeleton title="Upcoming Bills" variant="list" />
        <CardSkeleton title="Latest Expenses" variant="list" />
        <CardSkeleton title="Performance" variant="chart" />
        <CardSkeleton title="Top Categories" variant="chart" />
        <CardSkeleton title="Demographic Comparison" variant="value" />
        <CardSkeleton title="Insight" variant="value" />
      </div>

      {/* Desktop: Pure Tailwind Bento Grid (>= 1536px) */}
      <div className="hidden 2xl:grid 2xl:grid-cols-4 2xl:gap-4 2xl:px-6 2xl:pb-6">
        <div className="col-span-3 flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
              <CardSkeleton title="Update" variant="update" />
            </div>
            <div className="flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
              <CardSkeleton title="Total" variant="value" />
            </div>
            <div className="flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
              <CardSkeleton title={getAverageCardTitle()} variant="value" />
            </div>
          </div>
          <div className="grid grid-cols-5 gap-4">
            <div className="col-span-3 flex flex-col gap-4">
              <div className="flex-[7] min-h-0 flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
                <CardSkeleton title="Latest Expenses" variant="list" />
              </div>
              <div className="min-h-0 flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
                <CardSkeleton title="Demographic Comparison" variant="value" />
              </div>
            </div>
            <div className="col-span-2 flex flex-col gap-4">
              <div className="flex-1 min-h-0 flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
                <CardSkeleton title="Performance" variant="chart" />
              </div>
              <div className="min-h-0 flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
                <CardSkeleton title="Insight" variant="value" />
              </div>
            </div>
          </div>
        </div>
        <div className="col-span-1 flex flex-col gap-4">
          <div className="flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
            <CardSkeleton title="Upcoming Bills" variant="list" />
          </div>
          <div className="flex-1 min-h-0 flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
            <CardSkeleton title="Top Categories" variant="chart" />
          </div>
        </div>
      </div>
    </>
  );

  if (loading) {
    return (
      <main className="min-h-screen bg-[#202020]">
        {/* Desktop Header */}
        <div className="hidden md:block">
          <DashboardHeader 
            pageName="Expenses"
            actionButton={{
              label: 'Add Expense',
              onClick: () => console.log('Add expense'),
            }}
            timePeriod={timePeriod}
            onTimePeriodChange={setTimePeriod}
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

        {/* Loading State with Skeletons */}
        {renderSkeletonLayout()}
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#202020]">
        {/* Desktop Header */}
        <div className="hidden md:block">
          <DashboardHeader 
            pageName="Expenses"
            actionButton={{
              label: 'Add Expense',
              onClick: () => console.log('Add expense'),
            }}
            timePeriod={timePeriod}
            onTimePeriodChange={setTimePeriod}
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

        {/* Error State */}
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
          <div className="text-body opacity-70 text-center">{error}</div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-full bg-[#AC66DA] text-[#E7E4E4] text-body font-medium hover:opacity-90 transition-opacity"
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#202020]">
      {/* Desktop Header */}
      <div className="hidden md:block">
        <DashboardHeader 
          pageName="Expenses"
          actionButton={{
            label: 'Add Expense',
            onClick: () => console.log('Add expense'),
          }}
          timePeriod={timePeriod}
          onTimePeriodChange={setTimePeriod}
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
          date={update.date}
          message={update.message}
          highlight={update.highlight}
          link={update.link}
          linkHref="/transactions"
        />
        <div className="grid grid-cols-2 gap-4">
          <div className="card-surface flex flex-col px-6 py-4 rounded-[30px] gap-3">
            <h2 className="text-card-header">Total</h2>
            <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
              <span className="text-card-currency flex-shrink-0">{currency.symbol}</span>
              <span className="text-card-value break-all min-w-0">{formatNumber(total.amount)}</span>
            </div>
            <TrendIndicator value={total.trend} label={getComparisonLabel(timePeriod)} isExpense={true} />
          </div>
          {(timePeriod === 'This Month' || timePeriod === 'Last Month') && averageDaily !== null ? (
            <AverageDailyCard amount={averageDaily.amount} trend={averageDaily.trend} isExpense={true} />
          ) : (
            <AverageMonthlyCard amount={averageMonthly.amount} trend={averageMonthly.trend} isExpense={true} />
          )}
        </div>
        <UpcomingBillsCard bills={mockBills} />
        <LatestExpensesCard expenses={latestExpenses} />
        <PerformanceCard 
          trend={performance.trend}
          trendText={performance.trendText}
          data={performance.data}
          isExpense={true}
        />
        <TopCategoriesCard categories={topCategories} />
        <DemographicComparisonCard
          message={demographicComparison.message}
          percentage={demographicComparison.percentage}
          percentageLabel={demographicComparison.percentageLabel}
          link={demographicComparison.link}
          linkHref="/statistics"
        />
        <InsightCard
          title={insight.title}
          amount={insight.amount}
          message={insight.message}
          investmentAmount={insight.investmentAmount}
          trend={insight.trend}
          shortRow
        />
      </div>

      {/* Two-column layout: 768px - 1536px */}
      <div className="hidden md:grid 2xl:hidden md:grid-cols-2 md:gap-4 md:px-6 md:pb-6">
        <UpdateCard
          date={update.date}
          message={update.message}
          highlight={update.highlight}
          link={update.link}
          linkHref="/transactions"
        />
        <div className="card-surface flex flex-col px-6 py-4 rounded-[30px] gap-3">
          <h2 className="text-card-header">Total</h2>
          <div className="flex items-baseline gap-2 flex-1 min-w-0 flex-wrap">
            <span className="text-card-currency flex-shrink-0">{currency.symbol}</span>
            <span className="text-card-value break-all min-w-0">{formatNumber(total.amount)}</span>
          </div>
          <TrendIndicator value={total.trend} label={getComparisonLabel(timePeriod)} isExpense={true} />
        </div>
        {(timePeriod === 'This Month' || timePeriod === 'Last Month') && averageDaily !== null ? (
          <AverageDailyCard amount={averageDaily.amount} trend={averageDaily.trend} isExpense={true} />
        ) : (
          <AverageMonthlyCard amount={averageMonthly.amount} trend={averageMonthly.trend} isExpense={true} />
        )}
        <UpcomingBillsCard bills={mockBills} />
        <LatestExpensesCard expenses={latestExpenses} />
        <PerformanceCard 
          trend={performance.trend}
          trendText={performance.trendText}
          data={performance.data}
          isExpense={true}
        />
        <TopCategoriesCard categories={topCategories} />
        <DemographicComparisonCard
          message={demographicComparison.message}
          percentage={demographicComparison.percentage}
          percentageLabel={demographicComparison.percentageLabel}
          link={demographicComparison.link}
          linkHref="/statistics"
        />
        <InsightCard
          title={insight.title}
          amount={insight.amount}
          message={insight.message}
          investmentAmount={insight.investmentAmount}
          trend={insight.trend}
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
                date={update.date}
                message={update.message}
                highlight={update.highlight}
                link={update.link}
                linkHref="/transactions"
              />
            </div>
            <div className="flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
              <div className="card-surface flex flex-col px-6 py-4 rounded-[30px] gap-3 h-full">
                <h2 className="text-card-header">Total</h2>
                <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
                  <span className="text-card-currency flex-shrink-0">{currency.symbol}</span>
                  <span className="text-card-value break-all min-w-0">{formatNumber(total.amount)}</span>
                </div>
                <TrendIndicator value={total.trend} label={getComparisonLabel(timePeriod)} isExpense={true} />
              </div>
            </div>
            <div className="flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
              {(timePeriod === 'This Month' || timePeriod === 'Last Month') && averageDaily !== null ? (
                <AverageDailyCard amount={averageDaily.amount} trend={averageDaily.trend} isExpense={true} />
              ) : (
                <AverageMonthlyCard amount={averageMonthly.amount} trend={averageMonthly.trend} isExpense={true} />
              )}
            </div>
          </div>

          {/* Row 2: Sub-bento grid */}
          <div className="grid grid-cols-5 gap-4">
            {/* Left column (3 cols): Latest Expenses + Demographic Comparison stacked */}
            <div className="col-span-3 flex flex-col gap-4">
              <div className="flex-[7] min-h-0 flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
                <LatestExpensesCard expenses={latestExpenses} />
              </div>
              <div className="min-h-0 flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
                <DemographicComparisonCard
                  message={demographicComparison.message}
                  percentage={demographicComparison.percentage}
                  percentageLabel={demographicComparison.percentageLabel}
                  link={demographicComparison.link}
                  linkHref="/statistics"
                />
              </div>
            </div>

            {/* Right column (2 cols): Performance + Insight */}
            <div className="col-span-2 flex flex-col gap-4">
              {/* Top row: Performance fills space */}
              <div className="flex-1 min-h-0 flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
                <PerformanceCard 
                  trend={performance.trend}
                  trendText={performance.trendText}
                  data={performance.data}
                  isExpense={true}
                />
              </div>
              
              {/* Bottom row: Insight */}
              <div className="min-h-0 flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
                <InsightCard
                  title={insight.title}
                  amount={insight.amount}
                  message={insight.message}
                  investmentAmount={insight.investmentAmount}
                  trend={insight.trend}
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
            <TopCategoriesCard categories={topCategories} />
          </div>
        </div>
      </div>
    </main>
  );
}

