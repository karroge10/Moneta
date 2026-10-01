'use client';

import { useMemo, useState } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import MobileNavbar from '@/components/MobileNavbar';
import UpdateCard from '@/components/dashboard/UpdateCard';
import PeriodTotalCard from '@/components/dashboard/PeriodTotalCard';
import UpcomingRecurringCard from '@/components/dashboard/UpcomingRecurringCard';
import TransactionsCard from '@/components/dashboard/TransactionsCard';
import GoalsCard from '@/components/dashboard/GoalsCard';
import FinancialHealthCard from '@/components/dashboard/FinancialHealthCard';
import FinancialHealthModal from '@/components/dashboard/FinancialHealthModal';
import InvestmentsCard from '@/components/dashboard/InvestmentsCard';
import InsightCard from '@/components/dashboard/InsightCard';
import TopExpensesCard from '@/components/dashboard/TopExpensesCard';
import DashboardSkeleton from '@/components/dashboard/DashboardSkeleton';
import DashboardLayout, { type DashboardSlots, type LayoutBreakpoint } from '@/components/dashboard/DashboardLayout';
import GoalModal from '@/components/goals/GoalModal';
import TransactionModal from '@/components/transactions/TransactionModal';
import Confetti from '@/components/ui/Confetti';
import ErrorState from '@/components/ui/ErrorState';
import { toUpcomingItems } from '@/components/cashflow/upcoming-items';
import { buildTransactionFromRecurring } from '@/lib/recurring-utils';
import { formatDate } from '@/lib/format';
import type { Transaction, TimePeriod, Goal, Bill } from '@/types/dashboard';
import { useCategories } from '@/hooks/useCategories';
import { useCurrencyOptions } from '@/hooks/useCurrencyOptions';
import { useDashboardData, type DashboardData } from '@/hooks/useDashboardData';
import { useCashflowMutations } from '@/hooks/useCashflowMutations';
import { useDashboardGoalMutations } from '@/hooks/useDashboardGoalMutations';
import { useToast } from '@/contexts/ToastContext';

const UPDATE = {
  message: 'See monthly totals and category breakdowns in Statistics.',
  highlight: 'monthly totals',
  link: 'View Statistics',
  linkHref: '/statistics',
};

export default function DashboardPage() {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('This Month');
  const [healthModalOpen, setHealthModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const { categories } = useCategories();
  const { currencyOptions, loading: currencyOptionsLoading } = useCurrencyOptions();
  const dashboard = useDashboardData(timePeriod);
  const cashflow = useCashflowMutations();
  const goalMutations = useDashboardGoalMutations();
  const { addToast } = useToast();

  const data = dashboard.data;
  const recurringItems = data?.recurringItems;
  const upcomingBills = useMemo(() => toUpcomingItems(recurringItems ?? [], categories), [recurringItems, categories]);

  const handleGoalSave = (updatedGoal: Goal) => {
    const progress = updatedGoal.targetAmount > 0 ? (updatedGoal.currentAmount / updatedGoal.targetAmount) * 100 : 0;
    const wasIncomplete = selectedGoal ? selectedGoal.progress < 100 : true;
    const justCompleted = wasIncomplete && progress >= 100;
    goalMutations.save.mutate(
      { goal: updatedGoal, isNew: false },
      {
        onSuccess: () => {
          setSelectedGoal(null);
          if (justCompleted) setShowConfetti(true);
        },
        onError: (error) => addToast(error.message || 'Failed to save goal', 'error'),
      },
    );
  };

  const handleGoalDelete = () => {
    if (!selectedGoal) return;
    goalMutations.remove.mutate(selectedGoal.id, {
      onSuccess: () => setSelectedGoal(null),
      onError: (error) => addToast(error.message || 'Failed to delete goal', 'error'),
    });
  };

  const handleUpcomingBillClick = (bill: Bill) => {
    const item = recurringItems?.find((i) => i.id === Number(bill.id));
    if (item && categories.length > 0) setSelectedTransaction(buildTransactionFromRecurring(item, categories));
  };

  const handleRecurringSave = (updated: Transaction) => {
    cashflow.save.mutate(
      { transaction: updated, mode: 'edit', kind: 'expense' },
      {
        onSuccess: () => setSelectedTransaction(null),
        onError: (error) => addToast(error.message || 'Failed to save recurring', 'error'),
      },
    );
  };

  const handleRecurringDelete = () => {
    if (!selectedTransaction) return;
    cashflow.remove.mutate(selectedTransaction, {
      onSuccess: () => setSelectedTransaction(null),
      onError: (error) => addToast(error.message || 'Failed to delete recurring', 'error'),
    });
  };

  const handlePauseResume = (recurringId: number, isActive: boolean) => {
    const item = recurringItems?.find((i) => i.id === recurringId);
    if (!item) return;
    cashflow.setActive.mutate(
      { item, isActive },
      {
        onSuccess: () =>
          setSelectedTransaction((prev) =>
            prev?.recurringId === recurringId && prev.recurring ? { ...prev, recurring: { ...prev.recurring, isActive } } : prev,
          ),
        onError: (error) => addToast(error.message || 'Failed to update', 'error'),
      },
    );
  };

  const header = (
    <>
      <div className="hidden md:block">
        <DashboardHeader timePeriod={timePeriod} onTimePeriodChange={setTimePeriod} />
      </div>
      <div className="md:hidden">
        <MobileNavbar pageName="Dashboard" activeSection="dashboard" />
      </div>
    </>
  );

  if (!data) {
    return (
      <main className="min-h-screen bg-background">
        {header}
        {dashboard.isError ? (
          <ErrorState
            className="min-h-[60vh]"
            message={dashboard.error.message}
            onRetry={() => dashboard.refetch()}
            retrying={dashboard.isFetching}
          />
        ) : (
          <DashboardSkeleton />
        )}
      </main>
    );
  }

  const today = formatDate(new Date(), 'medium');
  const openHealthModal = () => setHealthModalOpen(true);

  const slots = (breakpoint: LayoutBreakpoint): DashboardSlots => ({
    update: <UpdateCard date={today} {...UPDATE} />,
    income: <PeriodTotalCard type="income" {...data.income} missingRates={data.missingRates} />,
    expenses: <PeriodTotalCard type="expense" {...data.expenses} missingRates={data.missingRates} />,
    goals: <GoalsCard goals={data.goals} currencyOptions={currencyOptions} onGoalClick={setSelectedGoal} />,
    health: renderHealthCard(data, breakpoint, openHealthModal),
    upcoming: (
      <UpcomingRecurringCard
        title="Upcoming Bills"
        items={upcomingBills}
        emptyTitle="No upcoming bills yet"
        emptyDescription="Create a recurring bill to see it here"
        onItemClick={handleUpcomingBillClick}
      />
    ),
    transactions: <TransactionsCard transactions={data.transactions} />,
    insight: (
      <InsightCard
        insight={data.roundupInsight}
        timePeriod={timePeriod}
        shortRow={breakpoint === 'mobile'}
        minimal={breakpoint === 'md'}
      />
    ),
    investments: <InvestmentsCard investments={data.investments} />,
    topExpenses: <TopExpensesCard expenses={data.topExpenses} />,
  });

  return (
    <main className="min-h-screen bg-background">
      {header}
      <DashboardLayout slots={slots} />

      {selectedGoal && currencyOptions.length > 0 && (
        <GoalModal
          goal={selectedGoal}
          mode="edit"
          currencyOptions={currencyOptions}
          onClose={() => setSelectedGoal(null)}
          onSave={handleGoalSave}
          onDelete={handleGoalDelete}
          isSaving={goalMutations.save.isPending}
        />
      )}
      {selectedTransaction && categories.length > 0 && currencyOptions.length > 0 && (
        <TransactionModal
          transaction={selectedTransaction}
          mode="edit"
          onClose={() => setSelectedTransaction(null)}
          onSave={handleRecurringSave}
          onDelete={handleRecurringDelete}
          onPauseResume={handlePauseResume}
          isSaving={cashflow.save.isPending || cashflow.setActive.isPending}
          isDeleting={cashflow.remove.isPending}
          categories={categories}
          currencyOptions={currencyOptions}
          currencyOptionsLoading={currencyOptionsLoading}
        />
      )}
      <FinancialHealthModal isOpen={healthModalOpen} onClose={() => setHealthModalOpen(false)} initialData={data.financialHealth} />
      {showConfetti && <Confetti onComplete={() => setShowConfetti(false)} />}
    </main>
  );
}

function renderHealthCard(data: DashboardData, breakpoint: LayoutBreakpoint, onLearnClick: () => void) {
  const score = data.financialHealth?.score ?? 0;
  const trend = data.financialHealth?.trend;
  return (
    <FinancialHealthCard
      score={score}
      trend={trend}
      mobile={breakpoint === 'mobile'}
      minimal={breakpoint === 'md'}
      onLearnClick={onLearnClick}
    />
  );
}
