'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import { TimePeriod, LatestIncome, IncomeSource, PerformanceDataPoint, Transaction, RecurringItem } from '@/types/dashboard';
import { buildTransactionFromRecurring } from '@/lib/recurring-utils';
import { formatDateForDisplay } from '@/lib/dateFormatting';
import { formatNumber } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import { useCategories } from '@/hooks/useCategories';
import { useCurrencyOptions } from '@/hooks/useCurrencyOptions';
import { useAuthReadyForApi } from '@/hooks/useAuthReadyForApi';

export default function IncomePage() {
  const authReady = useAuthReadyForApi();
  const { currency, incomeTaxRate } = useCurrency();
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
  const [average, setAverage] = useState<{ amount: number; trend: number; trendSkipped?: boolean; subtitle: string }>({ amount: 0, trend: 0, subtitle: 'Monthly average based on selected time period' });
  const [averageDaily, setAverageDaily] = useState<{ amount: number; trend: number; trendSkipped?: boolean } | null>(null);
  const [nextMonthPrediction, setNextMonthPrediction] = useState<number | null>(null);
  const [recurringItems, setRecurringItems] = useState<RecurringItem[]>([]);
  const [demographicComparison, setDemographicComparison] = useState<{ message: string; percentage: number; percentageLabel: string; link: string } | null>(null);
  const { categories } = useCategories();
  const { currencyOptions, loading: currencyOptionsLoading } = useCurrencyOptions();

  
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
  
  
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  
  const update = {
    date: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
    message: 'Your income pipeline looks healthy.',
    highlight: 'looks healthy',
    link: 'View Statistics'
  };

  const incomeFetchSeq = useRef(0);

  const fetchIncomeData = useCallback(async (signal?: AbortSignal) => {
    const seq = ++incomeFetchSeq.current;
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ timePeriod });
      const response = await fetch(`/api/income?${params.toString()}`, { signal });

      if (!response.ok) {
        throw new Error('Failed to fetch income data');
      }

      const data = await response.json();
      if (seq !== incomeFetchSeq.current) return;

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
      setDemographicComparison(data.demographicComparison || null);
      setAverage({
        amount: data.average?.amount || 0,
        trend: data.average?.trend || 0,
        trendSkipped: data.average?.trendSkipped,
        subtitle: data.average?.subtitle || 'Monthly average based on selected time period',
      });
      setAverageDaily(data.averageDaily ? {
        amount: data.averageDaily.amount,
        trend: data.averageDaily.trend,
        trendSkipped: data.averageDaily.trendSkipped,
      } : null);

      const recurringResponse = await fetch('/api/recurring?type=income', { signal });
      if (seq !== incomeFetchSeq.current) return;

      if (recurringResponse.ok) {
        const recurringData = await recurringResponse.json();
        setRecurringItems(recurringData.items ?? []);
      } else {
        setRecurringItems([]);
      }
    } catch (err) {
      const aborted =
        (err instanceof DOMException && err.name === 'AbortError') ||
        (err instanceof Error && err.name === 'AbortError');
      if (aborted) return;
      if (seq !== incomeFetchSeq.current) return;
      console.error('Error fetching income data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load income data');
      setTotal({ amount: 0, trend: 0, trendSkipped: false });
      setTopSources([]);
      setLatestIncomes([]);
      setPerformance({ trend: 0, trendText: '', data: [] });
      setAverage({ amount: 0, trend: 0, subtitle: 'Monthly average based on selected time period' });
      setRecurringItems([]);
      setDemographicComparison(null);
    } finally {
      if (seq === incomeFetchSeq.current) {
        setLoading(false);
      }
    }
  }, [timePeriod]);

  useEffect(() => {
    if (!authReady) return;
    const ac = new AbortController();
    void fetchIncomeData(ac.signal);
    return () => {
      ac.abort();
      incomeFetchSeq.current += 1;
    };
  }, [authReady, fetchIncomeData]);

  
  const createDraftIncome = (): Transaction => ({
    id: crypto.randomUUID(),
    name: '',
    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    amount: 0.01, 
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
      fetchIncomeData(); 
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
      setIsDeleting(true);
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
    } finally {
      setIsDeleting(false);
    }
  };

  
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

  
  const getAverageCardTitle = (): string => {
    if (timePeriod === 'This Month' || timePeriod === 'Last Month') return 'Average Daily';
    return 'Average';
  };

  
  const renderSkeletonLayout = () => (
    <>
      {}
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

      {}
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

      {}
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
          <div className="grid grid-cols-5 gap-4 flex-1">
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
      <main className="min-h-screen bg-background">
        {}
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

        {}
        <div className="md:hidden">
          <MobileNavbar 
            pageName="Income" 
            timePeriod={timePeriod} 
            onTimePeriodChange={setTimePeriod}
            activeSection="income"
          />
        </div>

        {}
        {renderSkeletonLayout()}

        {}
        {selectedTransaction && (
          <TransactionModal
            transaction={selectedTransaction}
            mode={modalMode}
            onClose={handleCloseModal}
            onSave={handleSave}
            onDelete={handleDelete}
            onPauseResume={selectedTransaction.recurringId !== undefined ? handlePauseResume : undefined}
            isSaving={isSaving}
            isDeleting={isDeleting}
            categories={categories}
            currencyOptions={currencyOptions}
            currencyOptionsLoading={currencyOptionsLoading}
          />
        )}
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-background">
        {}
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

        {}
        <div className="md:hidden">
          <MobileNavbar 
            pageName="Income" 
            timePeriod={timePeriod} 
            onTimePeriodChange={setTimePeriod}
            activeSection="income"
          />
        </div>

        {}
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
          <div className="text-body opacity-70 text-center">{error}</div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-full bg-[#E7E4E4] text-[#282828] text-body font-medium hover:opacity-90 transition-opacity"
          >
            Retry
          </button>
        </div>

        {}
        {selectedTransaction && (
          <TransactionModal
            transaction={selectedTransaction}
            mode={modalMode}
            onClose={handleCloseModal}
            onSave={handleSave}
            onDelete={handleDelete}
            onPauseResume={selectedTransaction.recurringId !== undefined ? handlePauseResume : undefined}
            isSaving={isSaving}
            isDeleting={isDeleting}
            categories={categories}
            currencyOptions={currencyOptions}
            currencyOptionsLoading={currencyOptionsLoading}
          />
        )}
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      {}
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

      {}
      <div className="md:hidden">
        <MobileNavbar 
          pageName="Income" 
          timePeriod={timePeriod} 
          onTimePeriodChange={setTimePeriod}
          activeSection="income"
        />
      </div>

      {}
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
          <span className="text-card-currency shrink-0 opacity-50">{currency.symbol}</span>
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
          message={demographicComparison?.message || ''}
          percentage={demographicComparison?.percentage || 0}
          percentageLabel={demographicComparison?.percentageLabel || ''}
          link={demographicComparison?.link || 'Statistics'}
          linkHref={demographicComparison?.link === 'Settings' ? '/settings' : '/statistics'}
        />
        {(timePeriod === 'This Month' || timePeriod === 'Last Month') && averageDaily !== null ? (
          <AverageDailyCard amount={averageDaily.amount} trend={averageDaily.trend} trendSkipped={averageDaily.trendSkipped} />
        ) : (
          <AverageCard
            amount={average.amount}
            trend={average.trend}
            trendSkipped={average.trendSkipped}
            subtitle={average.subtitle}
            trendLabel={getComparisonLabel(timePeriod)}
          />
        )}
      </div>

      {}
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
          message={demographicComparison?.message || ''}
          percentage={demographicComparison?.percentage || 0}
          percentageLabel={demographicComparison?.percentageLabel || ''}
          link={demographicComparison?.link || 'Statistics'}
          linkHref={demographicComparison?.link === 'Settings' ? '/settings' : '/statistics'}
        />
        {(timePeriod === 'This Month' || timePeriod === 'Last Month') && averageDaily !== null ? (
          <AverageDailyCard amount={averageDaily.amount} trend={averageDaily.trend} trendSkipped={averageDaily.trendSkipped} />
        ) : (
          <AverageCard
            amount={average.amount}
            trend={average.trend}
            trendSkipped={average.trendSkipped}
            subtitle={average.subtitle}
            trendLabel={getComparisonLabel(timePeriod)}
          />
        )} </div>

      {}
      <div className="hidden 2xl:grid 2xl:grid-cols-4 2xl:gap-4 2xl:px-6 2xl:pb-6">
        {}
        <div className="col-span-3 flex flex-col gap-4">
          {}
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

          {}
          <div className="grid grid-cols-5 gap-4 flex-1">
            {}
            <div className="col-span-3 flex flex-col gap-4">
              <div className="flex-[7] min-h-0 flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
                <LatestIncomesCard incomes={latestIncomes} onItemClick={handleLatestIncomeClick} />
              </div>
              <div className="min-h-0 flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
                <DemographicComparisonCard
                  message={demographicComparison?.message || ''}
                  percentage={demographicComparison?.percentage || 0}
                  percentageLabel={demographicComparison?.percentageLabel || ''}
                  link={demographicComparison?.link || 'Statistics'}
                  linkHref={demographicComparison?.link === 'Settings' ? '/settings' : '/statistics'}
                />
              </div>
            </div>

            {}
            <div className="col-span-2 flex flex-col gap-4">
              {}
              <div className="flex-1 min-h-0 flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
                <PerformanceCard 
                  trend={performance.trend}
                  trendText={performance.trendText}
                  data={performance.data}
                />
              </div>
              
              {}
              <div className="min-h-0 flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
                {(timePeriod === 'This Month' || timePeriod === 'Last Month') && averageDaily !== null ? (
                  <AverageDailyCard amount={averageDaily.amount} trend={averageDaily.trend} trendSkipped={averageDaily.trendSkipped} />
                ) : (
                  <AverageCard
                    amount={average.amount}
                    trend={average.trend}
                    trendSkipped={average.trendSkipped}
                    subtitle={average.subtitle}
                    trendLabel={getComparisonLabel(timePeriod)}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {}
        <div className="col-span-1 flex flex-col gap-4">
          <div className="flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
            <UpcomingIncomesCard incomes={upcomingIncomes} onItemClick={handleUpcomingIncomeClick} />
          </div>
          <div className="flex-1 min-h-0 flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
            <TopSourcesCard sources={topSources} />
          </div>
        </div>
      </div>

      {}
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

