'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import MobileNavbar from '@/components/MobileNavbar';
import UpdateCard from '@/components/dashboard/UpdateCard';
import UpcomingIncomesCard from '@/components/dashboard/UpcomingIncomesCard';
import LatestIncomesCard from '@/components/dashboard/LatestIncomesCard';
import PerformanceCard from '@/components/dashboard/PerformanceCard';
import TopSourcesCard from '@/components/dashboard/TopSourcesCard';
import DemographicComparisonCard from '@/components/dashboard/DemographicComparisonCard';
import AverageCard from '@/components/dashboard/AverageCard';
import AverageDailyCard from '@/components/dashboard/AverageDailyCard';
import EstimatedTaxCard from '@/components/dashboard/EstimatedTaxCard';
import ValueCard from '@/components/dashboard/ValueCard';
import CardSkeleton from '@/components/dashboard/CardSkeleton';
import TrendIndicator from '@/components/ui/TrendIndicator';
import TransactionModal from '@/components/transactions/TransactionModal';
import { mockIncomePage } from '@/lib/mockData';
import { TimePeriod, LatestIncome, IncomeSource, PerformanceDataPoint, Transaction, RecurringItem } from '@/types/dashboard';
import { buildTransactionFromRecurring } from '@/lib/recurring-utils';
import { formatDateForDisplay } from '@/lib/dateFormatting';
import { formatNumber } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import { useCategories } from '@/hooks/useCategories';
import { useCurrencyOptions } from '@/hooks/useCurrencyOptions';

export default function IncomePage() {
  const { currency } = useCurrency();
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('This Year');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState({ amount: 0, trend: 0, trendSkipped: false });
  const [topSources, setTopSources] = useState<IncomeSource[]>([]);
  const [latestIncomes, setLatestIncomes] = useState<LatestIncome[]>([]);
  const [performance, setPerformance] = useState<{ trend: number; trendText: string; data: PerformanceDataPoint[] }>({
    trend: 0,
    trendText: '',
    data: [],
  });
  const [average, setAverage] = useState({ amount: 0, trend: 0, subtitle: 'Monthly average based on selected time period' });
  const [averageDaily, setAverageDaily] = useState<{ amount: number; trend: number } | null>(null);
  const [nextMonthPrediction, setNextMonthPrediction] = useState<number | null>(null);
  const [recurringItems, setRecurringItems] = useState<RecurringItem[]>([]);
  const { categories } = useCategories();
  const { currencyOptions } = useCurrencyOptions();

  // Derive upcoming list for the card from full recurring items (no extra fetch on click)
  const upcomingIncomes = useMemo(() => {
    return recurringItems
      .filter((i) => i.nextDueDate)
      .sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime())
      .map((item) => ({
        id: String(item.id),
        name: item.name,
        date: formatDateForDisplay(item.nextDueDate),
        amount: item.convertedAmount ?? item.amount,
        category: item.category ?? null,
        icon: categories.find((c) => c.name === item.category)?.icon ?? 'HelpCircle',
        isActive: item.isActive,
      }));
  }, [recurringItems, categories]);
  
  // Transaction modal state
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [isSaving, setIsSaving] = useState(false);
  
  // Keep mock data for components not requested to be changed
  const update = mockIncomePage.update;
  const demographicComparison = mockIncomePage.demographicComparison;

  const [incomeTaxRate, setIncomeTaxRate] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/user/settings')
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
        if (data.incomeTaxRate != null) {
          setIncomeTaxRate(Number(data.incomeTaxRate));
        } else {
          setIncomeTaxRate(null);
        }
      })
      .catch(() => setIncomeTaxRate(null));
  }, []);
  
  const fetchIncomeData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ timePeriod });
      const response = await fetch(`/api/income?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch income data');
      }
      
      const data = await response.json();
      setTotal({
        amount: data.total?.amount || 0,
        trend: data.total?.trend || 0,
        trendSkipped: !!data.total?.trendSkipped,
      });
      setTopSources(data.topSources || []);
      setLatestIncomes(data.latestIncomes || []);
      setPerformance({
        trend: data.performance?.trend || 0,
        trendText: data.performance?.trendText || '',
        data: data.performance?.data || [],
      });
      setAverage({
        amount: data.average?.amount || 0,
        trend: data.average?.trend || 0,
        subtitle: data.average?.subtitle || 'Monthly average based on selected time period',
      });

      const recurringResponse = await fetch('/api/recurring?type=income');
      if (recurringResponse.ok) {
        const recurringData = await recurringResponse.json();
        setRecurringItems(recurringData.items ?? []);
      } else {
        setRecurringItems([]);
      }
    } catch (err) {
      console.error('Error fetching income data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load income data');
      setTotal({ amount: 0, trend: 0, trendSkipped: false });
      setTopSources([]);
      setLatestIncomes([]);
      setPerformance({ trend: 0, trendText: '', data: [] });
      setAverage({ amount: 0, trend: 0, subtitle: 'Monthly average based on selected time period' });
      setRecurringItems([]);
    } finally {
      setLoading(false);
    }
  }, [timePeriod]);

  useEffect(() => {
    fetchIncomeData();
  }, [fetchIncomeData]);

  // Create draft income transaction (positive amount for income)
  const createDraftIncome = (): Transaction => ({
    id: crypto.randomUUID(),
    name: '',
    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    amount: 0.01, // Positive amount indicates income
    category: null,
    icon: 'HelpCircle',
  });

  const handleAddIncomeClick = () => {
    setModalMode('add');
    setSelectedTransaction(createDraftIncome());
  };

  const handleLatestIncomeClick = (income: LatestIncome) => {
    setModalMode('edit');
    setSelectedTransaction(income);
  };

  const handleUpcomingIncomeClick = (income: Transaction) => {
    const item = recurringItems.find((i) => i.id === Number(income.id));
    if (item) {
      setModalMode('edit');
      setSelectedTransaction(buildTransactionFromRecurring(item, categories));
    }
  };

  const handlePauseResume = useCallback(
    async (recurringId: number, isActive: boolean) => {
      const item = recurringItems.find((i) => i.id === recurringId);
      if (!item) return;
      try {
        setError(null);
        setIsSaving(true);
        const response = await fetch('/api/recurring', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: item.id,
            name: item.name,
            amount: item.amount,
            type: item.type,
            category: item.category ?? null,
            startDate: item.startDate,
            endDate: item.endDate ?? null,
            frequencyUnit: item.frequencyUnit,
            frequencyInterval: item.frequencyInterval,
            isActive,
          }),
        });
        if (!response.ok) throw new Error('Failed to update');
        setSelectedTransaction((prev) =>
          prev && prev.recurringId === recurringId && prev.recurring
            ? { ...prev, recurring: { ...prev.recurring, isActive } }
            : prev
        );
        setRecurringItems((prev) =>
          prev.map((i) => (i.id === recurringId ? { ...i, isActive } : i))
        );
        fetchIncomeData();
      } catch (err) {
        console.error('Error pausing/resuming recurring:', err);
        setError(err instanceof Error ? err.message : 'Failed to update');
      } finally {
        setIsSaving(false);
      }
    },
    [recurringItems, fetchIncomeData]
  );

  const handleSave = async (updatedTransaction: Transaction) => {
    try {
      setError(null);
      setIsSaving(true);

      if (updatedTransaction.recurringId !== undefined) {
        const rec = updatedTransaction.recurring;
        if (!rec) throw new Error('Missing recurring data');
        const response = await fetch('/api/recurring', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: updatedTransaction.recurringId,
            name: updatedTransaction.name,
            amount: Math.abs(updatedTransaction.amount),
            type: 'income',
            startDate: rec.startDate,
            endDate: rec.endDate ?? null,
            frequencyUnit: rec.frequencyUnit,
            frequencyInterval: rec.frequencyInterval,
            isActive: rec.isActive ?? true,
            currencyId: updatedTransaction.currencyId,
            category: updatedTransaction.category,
          }),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to save recurring');
        }
        setSelectedTransaction(null);
        fetchIncomeData();
        return;
      }
      
      const isNew = modalMode === 'add';
      const isRecurring = updatedTransaction.recurring?.isRecurring;
      
      let response: Response;
      if (isNew && isRecurring) {
        const recurrence = updatedTransaction.recurring;
        const startDate = recurrence?.startDate || new Date().toISOString().split('T')[0];
        response = await fetch('/api/recurring', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: updatedTransaction.name,
            amount: Math.abs(updatedTransaction.amount),
            category: updatedTransaction.category,
            currencyId: updatedTransaction.currencyId,
            type: 'income',
            startDate,
            endDate: recurrence?.endDate ?? null,
            frequencyUnit: recurrence?.frequencyUnit ?? 'month',
            frequencyInterval: recurrence?.frequencyInterval ?? 1,
            createInitial: true,
          }),
        });
      } else if (isNew) {
        response = await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedTransaction),
        });
      } else {
        response = await fetch('/api/transactions', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedTransaction),
        });
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save transaction');
      }
      
      setSelectedTransaction(null);
      fetchIncomeData(); // Refresh income data and upcoming incomes
    } catch (err) {
      console.error('Error saving transaction:', err);
      setError(err instanceof Error ? err.message : 'Failed to save transaction');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCloseModal = () => {
    setSelectedTransaction(null);
  };

  const handleDelete = async () => {
    if (!selectedTransaction) return;

    try {
      if (selectedTransaction.recurringId !== undefined) {
        const response = await fetch(`/api/recurring?id=${selectedTransaction.recurringId}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to delete recurring');
        }
        setSelectedTransaction(null);
        fetchIncomeData();
        return;
      }

      const response = await fetch(`/api/transactions?id=${selectedTransaction.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete transaction');
      }
      
      setSelectedTransaction(null);
      fetchIncomeData();
    } catch (err) {
      console.error('Error deleting transaction:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete transaction');
    }
  };

  // Helper to get comparison label based on time period
  const getComparisonLabel = (period: TimePeriod): string => {
    switch (period) {
      case 'This Month':
        return 'from last month';
      case 'Last Month':
        return 'from 2 months ago';
      case 'This Year':
        return 'from last year';
      case 'Last Year':
        return 'from 2 years ago';
      case 'All Time':
        return 'since beginning';
      default:
        return '';
    }
  };

  // Helper to get card title based on time period
  const getAverageCardTitle = (): string => {
    if (timePeriod === 'This Month' || timePeriod === 'Last Month') return 'Average Daily';
    return 'Average';
  };

  // Helper to render skeleton layout
  const renderSkeletonLayout = () => (
    <>
      {/* Mobile: Custom Layout (< 768px) */}
      <div className="flex flex-col gap-4 px-4 pb-4 md:hidden">
        <CardSkeleton title="Update" variant="update" />
        <CardSkeleton title="Total" variant="value" />
        <CardSkeleton title="Estimated Tax" variant="value" />
        <CardSkeleton title="Upcoming Incomes" variant="list" />
        <CardSkeleton title="Latest Incomes" variant="list" />
        <CardSkeleton title="Performance" variant="chart" />
        <CardSkeleton title="Top Sources" variant="chart" />
        <CardSkeleton title="Demographic Comparison" variant="value" />
        <CardSkeleton title={getAverageCardTitle()} variant="value" />
      </div>

      {/* Two-column layout: 768px - 1536px */}
      <div className="hidden md:grid 2xl:hidden md:grid-cols-2 md:gap-4 md:px-6 md:pb-6">
        <CardSkeleton title="Update" variant="update" />
        <CardSkeleton title="Total" variant="value" />
        <CardSkeleton title="Estimated Tax" variant="value" />
        <CardSkeleton title="Upcoming Incomes" variant="list" />
        <CardSkeleton title="Latest Incomes" variant="list" />
        <CardSkeleton title="Performance" variant="chart" />
        <CardSkeleton title="Top Sources" variant="chart" />
        <CardSkeleton title="Demographic Comparison" variant="value" />
        <CardSkeleton title={getAverageCardTitle()} variant="value" />
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
              <CardSkeleton title="Estimated Tax" variant="value" />
            </div>
          </div>
          <div className="grid grid-cols-5 gap-4">
            <div className="col-span-3 flex flex-col gap-4">
              <div className="flex-[7] min-h-0 flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
                <CardSkeleton title="Latest Incomes" variant="list" />
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
              <CardSkeleton title={getAverageCardTitle()} variant="value" />
            </div>
            </div>
          </div>
        </div>
        <div className="col-span-1 flex flex-col gap-4">
          <div className="flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
            <CardSkeleton title="Upcoming Incomes" variant="list" />
          </div>
          <div className="flex-1 min-h-0 flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
            <CardSkeleton title="Top Sources" variant="chart" />
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
            pageName="Income"
            actionButton={{
              label: 'Add Income',
              onClick: handleAddIncomeClick,
            }}
            timePeriod={timePeriod}
            onTimePeriodChange={setTimePeriod}
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
            pageName="Income"
            actionButton={{
              label: 'Add Income',
              onClick: handleAddIncomeClick,
            }}
            timePeriod={timePeriod}
            onTimePeriodChange={setTimePeriod}
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
          pageName="Income"
actionButton={{
              label: 'Add Income',
              onClick: handleAddIncomeClick,
            }}
          timePeriod={timePeriod}
          onTimePeriodChange={setTimePeriod}
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
          date={update.date}
          message={update.message}
          highlight={update.highlight}
          link={update.link}
          linkHref="/statistics"
        />
        <ValueCard
          title="Total"
          bottomRow={total.trendSkipped ? (
          <span className="text-helper">Not enough data to compare yet</span>
        ) : (
          <TrendIndicator value={total.trend} label={getComparisonLabel(timePeriod)} />
        )}
        >
          <span className="text-card-currency shrink-0">{currency.symbol}</span>
          <span className="text-card-value break-all min-w-0">{formatNumber(total.amount)}</span>
        </ValueCard>
        <EstimatedTaxCard taxRate={incomeTaxRate} totalIncome={total.amount} />
        <UpcomingIncomesCard incomes={upcomingIncomes} onItemClick={handleUpcomingIncomeClick} />
        <LatestIncomesCard incomes={latestIncomes} onItemClick={handleLatestIncomeClick} />
        <PerformanceCard 
          trend={performance.trend}
          trendText={performance.trendText}
          data={performance.data}
        />
        <TopSourcesCard sources={topSources} />
        <DemographicComparisonCard
          message={demographicComparison.message}
          percentage={demographicComparison.percentage}
          percentageLabel={demographicComparison.percentageLabel}
          link={demographicComparison.link}
          linkHref="/statistics"
        />
        {(timePeriod === 'This Month' || timePeriod === 'Last Month') && averageDaily !== null ? (
          <AverageDailyCard amount={averageDaily.amount} trend={averageDaily.trend} />
        ) : (
          <AverageCard
            amount={average.amount}
            trend={average.trend}
            subtitle={average.subtitle}
            trendLabel="compared to last year"
          />
        )}
      </div>

      {/* Two-column layout: 768px - 1536px */}
      <div className="hidden md:grid 2xl:hidden md:grid-cols-2 md:gap-4 md:px-6 md:pb-6">
        <UpdateCard
          date={update.date}
          message={update.message}
          highlight={update.highlight}
          link={update.link}
          linkHref="/statistics"
        />
        <ValueCard
          title="Total"
          bottomRow={total.trendSkipped ? (
          <span className="text-helper">Not enough data to compare yet</span>
        ) : (
          <TrendIndicator value={total.trend} label={getComparisonLabel(timePeriod)} />
        )}
        >
          <span className="text-card-currency shrink-0">{currency.symbol}</span>
          <span className="text-card-value break-all min-w-0">{formatNumber(total.amount)}</span>
        </ValueCard>
        <EstimatedTaxCard taxRate={incomeTaxRate} totalIncome={total.amount} />
        <UpcomingIncomesCard incomes={upcomingIncomes} onItemClick={handleUpcomingIncomeClick} />
        <LatestIncomesCard incomes={latestIncomes} onItemClick={handleLatestIncomeClick} />
        <PerformanceCard 
          trend={performance.trend}
          trendText={performance.trendText}
          data={performance.data}
        />
        <TopSourcesCard sources={topSources} />
        <DemographicComparisonCard
          message={demographicComparison.message}
          percentage={demographicComparison.percentage}
          percentageLabel={demographicComparison.percentageLabel}
          link={demographicComparison.link}
          linkHref="/statistics"
        />
        {(timePeriod === 'This Month' || timePeriod === 'Last Month') && averageDaily !== null ? (
          <AverageDailyCard amount={averageDaily.amount} trend={averageDaily.trend} />
        ) : (
          <AverageCard
            amount={average.amount}
            trend={average.trend}
            subtitle={average.subtitle}
            trendLabel="compared to last year"
          />
        )}
      </div>

      {/* Desktop: Pure Tailwind Bento Grid (>= 1536px) */}
      <div className="hidden 2xl:grid 2xl:grid-cols-4 2xl:gap-4 2xl:px-6 2xl:pb-6">
        {/* Grid 1: Left side (3 columns) */}
        <div className="col-span-3 flex flex-col gap-4">
          {/* Row 1: Update, Total, Estimated Tax - equal width */}
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
              <UpdateCard
                date={update.date}
                message={update.message}
                highlight={update.highlight}
                link={update.link}
                linkHref="/statistics"
              />
            </div>
            <div className="flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
              <ValueCard
                title="Total"
                bottomRow={total.trendSkipped ? (
          <span className="text-helper">Not enough data to compare yet</span>
        ) : (
          <TrendIndicator value={total.trend} label={getComparisonLabel(timePeriod)} />
        )}
              >
                <span className="text-card-currency shrink-0">{currency.symbol}</span>
                <span className="text-card-value break-all min-w-0">{formatNumber(total.amount)}</span>
              </ValueCard>
            </div>
            <div className="flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
              <EstimatedTaxCard taxRate={incomeTaxRate} totalIncome={total.amount} />
            </div>
          </div>

          {/* Row 2: Sub-bento grid */}
          <div className="grid grid-cols-5 gap-4">
            {/* Left column (3 cols): Latest Incomes + Demographic Comparison stacked */}
            <div className="col-span-3 flex flex-col gap-4">
              <div className="flex-[7] min-h-0 flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
                <LatestIncomesCard incomes={latestIncomes} onItemClick={handleLatestIncomeClick} />
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

            {/* Right column (2 cols): Performance + Average */}
            <div className="col-span-2 flex flex-col gap-4">
              {/* Top row: Performance fills space */}
              <div className="flex-1 min-h-0 flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
                <PerformanceCard 
                  trend={performance.trend}
                  trendText={performance.trendText}
                  data={performance.data}
                />
              </div>
              
              {/* Bottom row: Average */}
              <div className="min-h-0 flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
                <AverageCard
                  amount={average.amount}
                  trend={average.trend}
                  subtitle={average.subtitle}
                  trendLabel="compared to last year"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Grid 2: Right side (1 column) - Upcoming Incomes + Top Sources */}
        <div className="col-span-1 flex flex-col gap-4">
          <div className="flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
            <UpcomingIncomesCard incomes={upcomingIncomes} onItemClick={handleUpcomingIncomeClick} />
          </div>
          <div className="flex-1 min-h-0 flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
            <TopSourcesCard sources={topSources} />
          </div>
        </div>
      </div>

      {/* Transaction Modal */}
      {selectedTransaction && (
        <TransactionModal
          transaction={selectedTransaction}
          mode={modalMode}
          onClose={handleCloseModal}
          onSave={handleSave}
          onDelete={handleDelete}
          onPauseResume={selectedTransaction.recurringId !== undefined ? handlePauseResume : undefined}
          isSaving={isSaving}
          categories={categories}
          currencyOptions={currencyOptions}
        />
      )}
    </main>
  );
}

