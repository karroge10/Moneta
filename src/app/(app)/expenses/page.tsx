'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import MobileNavbar from '@/components/MobileNavbar';
import UpdateCard from '@/components/dashboard/UpdateCard';
import UpcomingBillsCard from '@/components/dashboard/UpcomingBillsCard';
import LatestExpensesCard from '@/components/dashboard/LatestExpensesCard';
import PerformanceCard from '@/components/dashboard/PerformanceCard';
import TopCategoriesCard from '@/components/dashboard/TopCategoriesCard';
import DemographicComparisonCard from '@/components/dashboard/DemographicComparisonCard';
import InsightCard from '@/components/dashboard/InsightCard';
import AverageCard from '@/components/dashboard/AverageCard';
import AverageDailyCard from '@/components/dashboard/AverageDailyCard';
import ValueCard from '@/components/dashboard/ValueCard';
import CardSkeleton from '@/components/dashboard/CardSkeleton';
import TrendIndicator from '@/components/ui/TrendIndicator';
import TransactionModal from '@/components/transactions/TransactionModal';
import { emptyRoundupInsight, type RoundupInsightDto } from '@/lib/roundup-insight';
import { TimePeriod, LatestExpense, ExpenseCategory, PerformanceDataPoint, Transaction, Bill, RecurringItem } from '@/types/dashboard';
import { buildTransactionFromRecurring } from '@/lib/recurring-utils';
import { formatDateForDisplay } from '@/lib/dateFormatting';
import { formatNumber } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import { useCategories } from '@/hooks/useCategories';
import { useCurrencyOptions } from '@/hooks/useCurrencyOptions';
import { useAuthReadyForApi } from '@/hooks/useAuthReadyForApi';

export default function ExpensesPage() {
  const authReady = useAuthReadyForApi();
  const { currency } = useCurrency();
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('This Year');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState<{ amount: number; trend: number; trendSkipped?: boolean }>({ amount: 0, trend: 0 });
  const [topCategories, setTopCategories] = useState<ExpenseCategory[]>([]);
  const [latestExpenses, setLatestExpenses] = useState<LatestExpense[]>([]);
  const [performance, setPerformance] = useState<{ trend: number; trendText: string; data: PerformanceDataPoint[] }>({
    trend: 0,
    trendText: '',
    data: [],
  });
  const [averageMonthly, setAverageMonthly] = useState<{ amount: number; trend: number; trendSkipped?: boolean }>({ amount: 0, trend: 0 });
  const [averageDaily, setAverageDaily] = useState<{ amount: number; trend: number; trendSkipped?: boolean } | null>(null);
  const [recurringItems, setRecurringItems] = useState<RecurringItem[]>([]);
  const [roundupInsight, setRoundupInsight] = useState<RoundupInsightDto | null>(null);
  const [demographicComparison, setDemographicComparison] = useState<{ message: string; percentage: number; percentageLabel: string; link: string } | null>(null);
  const { categories } = useCategories();
  const { currencyOptions, loading: currencyOptionsLoading } = useCurrencyOptions();

  // Derive upcoming list for the card from full recurring items (no extra fetch on click)
  const upcomingBills = useMemo((): Bill[] => {
    return recurringItems
      .filter((i) => i.nextDueDate)
      .sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime())
      .map((item) => ({
        id: String(item.id),
        name: item.name,
        date: formatDateForDisplay(item.nextDueDate),
        amount: item.convertedAmount ?? item.amount,
        category: item.category ?? 'Uncategorized',
        icon: categories.find((c) => c.name === item.category)?.icon ?? 'HelpCircle',
        isActive: item.isActive,
      }));
  }, [recurringItems, categories]);
  
  // Transaction modal state
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Keep mock data for components not requested to be changed
  const update = {
    date: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
    message: 'Your expenses are well within limits.',
    highlight: 'within limits',
    link: 'View Statistics'
  };

  const expensesFetchSeq = useRef(0);

  const fetchExpensesData = useCallback(async (signal?: AbortSignal) => {
    const seq = ++expensesFetchSeq.current;
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ timePeriod });
      const response = await fetch(`/api/expenses?${params.toString()}`, { signal });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error ?? 'Failed to fetch expenses data');
      }

      const data = await response.json();
      if (seq !== expensesFetchSeq.current) return;

      if (data && !data.error) {
        setTotal({
          amount: data.total?.amount || 0,
          trend: data.total?.trend || 0,
          trendSkipped: data.total?.trendSkipped,
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
          trendSkipped: data.averageMonthly?.trendSkipped,
        });
        setAverageDaily(data.averageDaily ? {
          amount: data.averageDaily.amount,
          trend: data.averageDaily.trend,
          trendSkipped: data.averageDaily.trendSkipped,
        } : null);
        setRoundupInsight(data.roundupInsight ?? emptyRoundupInsight());
        setDemographicComparison(data.demographicComparison || null);
      }

      const recurringResponse = await fetch('/api/recurring?type=expense', { signal });
      if (seq !== expensesFetchSeq.current) return;

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
      if (seq !== expensesFetchSeq.current) return;
      console.error('Error fetching expenses data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load expenses data');
      setTotal({ amount: 0, trend: 0 });
      setTopCategories([]);
      setLatestExpenses([]);
      setPerformance({ trend: 0, trendText: '', data: [] });
      setAverageMonthly({ amount: 0, trend: 0 });
      setAverageDaily(null);
      setRoundupInsight(null);
      setRecurringItems([]);
      setDemographicComparison(null);
    } finally {
      if (seq === expensesFetchSeq.current) {
        setLoading(false);
      }
    }
  }, [timePeriod]);

  useEffect(() => {
    if (!authReady) return;
    const ac = new AbortController();
    void fetchExpensesData(ac.signal);
    return () => {
      ac.abort();
      expensesFetchSeq.current += 1;
    };
  }, [authReady, fetchExpensesData]);

  // Create draft expense transaction (negative amount for expense)
  const createDraftExpense = (): Transaction => ({
    id: crypto.randomUUID(),
    name: '',
    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    amount: -0.01, // Negative amount indicates expense
    category: null,
    icon: 'HelpCircle',
  });

  const handleAddExpenseClick = () => {
    setModalMode('add');
    setSelectedTransaction(createDraftExpense());
  };

  const handleLatestExpenseClick = (expense: LatestExpense) => {
    setModalMode('edit');
    setSelectedTransaction(expense);
  };

  const handleUpcomingBillClick = (bill: Bill) => {
    const item = recurringItems.find((i) => i.id === Number(bill.id));
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
        fetchExpensesData();
      } catch (err) {
        console.error('Error pausing/resuming recurring:', err);
        setError(err instanceof Error ? err.message : 'Failed to update');
      } finally {
        setIsSaving(false);
      }
    },
    [recurringItems, fetchExpensesData]
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
            type: 'expense',
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
        fetchExpensesData();
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
            type: 'expense',
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
      fetchExpensesData(); // Refresh expenses data and upcoming bills
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
        fetchExpensesData();
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
      fetchExpensesData();
    } catch (err) {
      console.error('Error deleting transaction:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete transaction');
    } finally {
      setIsDeleting(false);
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
        <CardSkeleton title="Round-up" variant="value" />
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
        <CardSkeleton title="Round-up" variant="value" />
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
          <div className="grid grid-cols-5 gap-4 flex-1">
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
                <CardSkeleton title="Round-up" variant="value" />
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
      <main className="min-h-screen bg-background">
        {/* Desktop Header */}
        <div className="hidden md:block">
          <DashboardHeader 
            pageName="Expenses"
            actionButton={{
              label: 'Add Expense',
              onClick: handleAddExpenseClick,
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

        {/* Transaction Modal (available even while loading) */}
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
        {/* Desktop Header */}
        <div className="hidden md:block">
          <DashboardHeader 
            pageName="Expenses"
            actionButton={{
              label: 'Add Expense',
              onClick: handleAddExpenseClick,
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
            className="px-4 py-2 rounded-full bg-[#E7E4E4] text-[#282828] text-body font-medium hover:opacity-90 transition-opacity"
          >
            Retry
          </button>
        </div>

        {/* Transaction Modal (available in error state too) */}
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
      {/* Desktop Header */}
      <div className="hidden md:block">
        <DashboardHeader 
          pageName="Expenses"
          actionButton={{
            label: 'Add Expense',
            onClick: handleAddExpenseClick,
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
          <ValueCard
            title="Total"
            bottomRow={total.trendSkipped ? (
              <span className="text-helper">Not enough data to compare yet</span>
            ) : (
              <TrendIndicator value={total.trend} label={getComparisonLabel(timePeriod)} isExpense={true} />
            )}
          >
            <span className="text-card-currency shrink-0 opacity-50">{currency.symbol}</span>
            <span className="text-card-value break-all min-w-0">{formatNumber(total.amount)}</span>
          </ValueCard>
          {(timePeriod === 'This Month' || timePeriod === 'Last Month') && averageDaily !== null ? (
            <AverageDailyCard amount={averageDaily.amount} trend={averageDaily.trend} trendSkipped={averageDaily.trendSkipped} isExpense />
          ) : (
            <AverageCard 
              amount={averageMonthly.amount} 
              trend={averageMonthly.trend} 
              trendSkipped={averageMonthly.trendSkipped}
              trendLabel={getComparisonLabel(timePeriod)}
            />
          )}
        </div>
        <UpcomingBillsCard bills={upcomingBills} onItemClick={handleUpcomingBillClick} />
        <LatestExpensesCard expenses={latestExpenses} onItemClick={handleLatestExpenseClick} />
        <PerformanceCard 
          trend={performance.trend}
          trendText={performance.trendText}
          data={performance.data}
          isExpense={true}
        />
        <TopCategoriesCard categories={topCategories} />
        <DemographicComparisonCard
          message={demographicComparison?.message || ''}
          percentage={demographicComparison?.percentage || 0}
          percentageLabel={demographicComparison?.percentageLabel || ''}
          link={demographicComparison?.link || 'Statistics'}
          linkHref={demographicComparison?.link === 'Settings' ? '/settings' : '/statistics'}
        />
        <InsightCard insight={roundupInsight ?? emptyRoundupInsight()} shortRow />
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
        <ValueCard
          title="Total"
          bottomRow={total.trendSkipped ? (
            <span className="text-helper">Not enough data to compare yet</span>
          ) : (
            <TrendIndicator value={total.trend} label={getComparisonLabel(timePeriod)} isExpense={true} />
          )}
        >
          <span className="text-card-currency shrink-0 opacity-50">{currency.symbol}</span>
          <span className="text-card-value break-all min-w-0">{formatNumber(total.amount)}</span>
        </ValueCard>
        {(timePeriod === 'This Month' || timePeriod === 'Last Month') && averageDaily !== null ? (
          <AverageDailyCard amount={averageDaily.amount} trend={averageDaily.trend} trendSkipped={averageDaily.trendSkipped} isExpense />
        ) : (
          <AverageCard 
            amount={averageMonthly.amount} 
            trend={averageMonthly.trend} 
            trendSkipped={averageMonthly.trendSkipped}
            trendLabel={getComparisonLabel(timePeriod)}
          />
        )}
        <UpcomingBillsCard bills={upcomingBills} onItemClick={handleUpcomingBillClick} />
        <LatestExpensesCard expenses={latestExpenses} onItemClick={handleLatestExpenseClick} />
        <PerformanceCard 
          trend={performance.trend}
          trendText={performance.trendText}
          data={performance.data}
          isExpense={true}
        />
        <TopCategoriesCard categories={topCategories} />
        <DemographicComparisonCard
          message={demographicComparison?.message || ''}
          percentage={demographicComparison?.percentage || 0}
          percentageLabel={demographicComparison?.percentageLabel || ''}
          link={demographicComparison?.link || 'Statistics'}
          linkHref={demographicComparison?.link === 'Settings' ? '/settings' : '/statistics'}
        />
        <InsightCard insight={roundupInsight ?? emptyRoundupInsight()} />
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
              <ValueCard
                title="Total"
                bottomRow={total.trendSkipped ? (
                  <span className="text-helper">Not enough data to compare yet</span>
                ) : (
                  <TrendIndicator value={total.trend} label={getComparisonLabel(timePeriod)} isExpense={true} />
                )}
              >
                <span className="text-card-currency shrink-0 opacity-50">{currency.symbol}</span>
                <span className="text-card-value break-all min-w-0">{formatNumber(total.amount)}</span>
              </ValueCard>
            </div>
            <div className="flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
              {(timePeriod === 'This Month' || timePeriod === 'Last Month') && averageDaily !== null ? (
                <AverageDailyCard amount={averageDaily.amount} trend={averageDaily.trend} trendSkipped={averageDaily.trendSkipped} isExpense />
              ) : (
                <AverageCard 
                  amount={averageMonthly.amount} 
                  trend={averageMonthly.trend} 
                  trendSkipped={averageMonthly.trendSkipped}
                  trendLabel={getComparisonLabel(timePeriod)}
                />
              )}
            </div>
          </div>

          {/* Row 2: Sub-bento grid */}
          <div className="grid grid-cols-5 gap-4 flex-1">
            {/* Left column (3 cols): Latest Expenses + Demographic Comparison stacked */}
            <div className="col-span-3 flex flex-col gap-4">
              <div className="flex-[7] min-h-0 flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
                <LatestExpensesCard expenses={latestExpenses} onItemClick={handleLatestExpenseClick} />
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
                <InsightCard insight={roundupInsight ?? emptyRoundupInsight()} />
              </div>
            </div>
          </div>
        </div>

        {/* Grid 2: Right side (1 column) - Upcoming Bills + Top Categories */}
        <div className="col-span-1 flex flex-col gap-4">
          <div className="flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
            <UpcomingBillsCard bills={upcomingBills} onItemClick={handleUpcomingBillClick} />
          </div>
          <div className="flex-1 min-h-0 flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
            <TopCategoriesCard categories={topCategories} />
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

