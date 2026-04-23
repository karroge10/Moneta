'use client';

import { useState, useMemo, useCallback } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import MobileNavbar from '@/components/MobileNavbar';
import UpdateCard from '@/components/dashboard/UpdateCard';
import IncomeCard from '@/components/dashboard/IncomeCard';
import ExpenseCard from '@/components/dashboard/ExpenseCard';
import UpcomingBillsCard from '@/components/dashboard/UpcomingBillsCard';
import TransactionsCard from '@/components/dashboard/TransactionsCard';
import GoalsCard from '@/components/dashboard/GoalsCard';
import FinancialHealthCard from '@/components/dashboard/FinancialHealthCard';
import FinancialHealthModal from '@/components/dashboard/FinancialHealthModal';
import InvestmentsCard from '@/components/dashboard/InvestmentsCard';
import InsightCard from '@/components/dashboard/InsightCard';
import TopExpensesCard from '@/components/dashboard/TopExpensesCard';
import DashboardSkeleton from '@/components/dashboard/DashboardSkeleton';
import GoalModal from '@/components/goals/GoalModal';
import TransactionModal from '@/components/transactions/TransactionModal';
import Confetti from '@/components/ui/Confetti';
import { getGoalStatus } from '@/lib/goalUtils';
import { buildTransactionFromRecurring } from '@/lib/recurring-utils';
import { formatDateForDisplay } from '@/lib/dateFormatting';
import { Transaction, TimePeriod, Goal, Bill } from '@/types/dashboard';
import { useCategories } from '@/hooks/useCategories';
import { useCurrencyOptions } from '@/hooks/useCurrencyOptions';
import { useDashboardData } from '@/hooks/useDashboardData';
import { emptyRoundupInsight } from '@/lib/roundup-insight';

export default function DashboardPage() {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('This Month');
  const [financialHealthModalOpen, setFinancialHealthModalOpen] = useState(false);
  
  // Modal states
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('edit');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hooks
  const { categories } = useCategories();
  const { currencyOptions, loading: currencyOptionsLoading } = useCurrencyOptions();
  const {
    income,
    expenses,
    transactions,
    topExpenses,
    investments,
    recurringItems,
    goals,
    financialHealth,
    roundupInsight,
    loading,
    error: fetchError,
    fetchDashboardData,
    fetchGoals,
  } = useDashboardData(timePeriod);

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

  const update = {
    date: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
    message: 'Your finances are tracking correctly.',
    highlight: 'tracking correctly',
    link: 'View Statistics'
  };

  // Event Handlers
  const handleEditGoal = (goal: Goal) => {
    setModalMode('edit');
    setSelectedGoal(goal);
  };

  const handleSave = async (updatedGoal: Goal) => {
    try {
      setError(null);
      setIsSaving(true);
      const calculatedProgress = updatedGoal.targetAmount > 0 ? (updatedGoal.currentAmount / updatedGoal.targetAmount) * 100 : 0;
      const isNowComplete = calculatedProgress >= 100;
      const wasIncomplete = selectedGoal ? selectedGoal.progress < 100 : true;
      const justCompleted = wasIncomplete && isNowComplete;
      const isNew = modalMode === 'add';

      const response = await fetch('/api/goals', {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: isNew ? undefined : updatedGoal.id,
          name: updatedGoal.name,
          targetDate: updatedGoal.targetDate,
          targetAmount: updatedGoal.targetAmount,
          currentAmount: updatedGoal.currentAmount,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save goal');
      }

      setSelectedGoal(null);
      if (justCompleted || (isNew && isNowComplete)) setShowConfetti(true);
      fetchGoals();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save goal');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpcomingBillClick = (bill: Bill) => {
    const item = recurringItems.find((i) => i.id === Number(bill.id));
    if (item && categories.length > 0) {
      setSelectedTransaction(buildTransactionFromRecurring(item, categories));
    }
  };

  const handleTransactionSave = async (updatedTransaction: Transaction) => {
    if (!selectedTransaction || selectedTransaction.recurringId === undefined) return;
    try {
      setIsSaving(true);
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
      if (!response.ok) throw new Error('Failed to save recurring');
      setSelectedTransaction(null);
      fetchDashboardData();
    } catch (err) {
      console.error('Error saving recurring:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTransactionDelete = async () => {
    if (!selectedTransaction || selectedTransaction.recurringId === undefined) return;
    try {
      setIsDeleting(true);
      const response = await fetch(`/api/recurring?id=${selectedTransaction.recurringId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete recurring');
      setSelectedTransaction(null);
      fetchDashboardData();
    } catch (err) {
      console.error('Error deleting recurring:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePauseResume = useCallback(
    async (recurringId: number, isActive: boolean) => {
      const item = recurringItems.find((i) => i.id === recurringId);
      if (!item) return;
      try {
        setIsSaving(true);
        const response = await fetch('/api/recurring', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...item, isActive }),
        });
        if (!response.ok) throw new Error('Failed to update');
        fetchDashboardData();
      } catch (err) {
        console.error('Error pausing/resuming recurring:', err);
      } finally {
        setIsSaving(false);
      }
    },
    [recurringItems, fetchDashboardData]
  );

  const handleDeleteGoal = async () => {
    if (!selectedGoal) return;
    try {
      const response = await fetch(`/api/goals?id=${selectedGoal.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete goal');
      setSelectedGoal(null);
      fetchGoals();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete goal');
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <div className="hidden md:block">
          <DashboardHeader timePeriod={timePeriod} onTimePeriodChange={setTimePeriod} />
        </div>
        <div className="md:hidden">
          <MobileNavbar pageName="Dashboard" activeSection="dashboard" />
        </div>
        <DashboardSkeleton />
      </main>
    );
  }

  const activeError = error || fetchError;
  if (activeError) {
    return (
      <main className="min-h-screen bg-background">
        <div className="hidden md:block">
          <DashboardHeader timePeriod={timePeriod} onTimePeriodChange={setTimePeriod} />
        </div>
        <div className="md:hidden">
          <MobileNavbar pageName="Dashboard" activeSection="dashboard" />
        </div>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
          <div className="text-body opacity-70 text-center">{activeError}</div>
          <button onClick={() => window.location.reload()} className="px-4 py-2 rounded-full bg-[#E7E4E4] text-[#282828] text-body font-medium hover:opacity-90 transition-opacity">Retry</button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="hidden md:block">
        <DashboardHeader timePeriod={timePeriod} onTimePeriodChange={setTimePeriod} />
      </div>
      <div className="md:hidden">
        <MobileNavbar pageName="Dashboard" activeSection="dashboard" />
      </div>

      {/* Mobile Layout */}
      <div className="flex flex-col gap-4 px-4 pb-4 md:hidden">
        <div className="grid grid-cols-2 gap-4">
          <IncomeCard amount={income.amount} trend={income.trend} comparisonLabel={income.comparisonLabel} />
          <ExpenseCard amount={expenses.amount} trend={expenses.trend} comparisonLabel={expenses.comparisonLabel} />
        </div>
        <GoalsCard goals={goals} currencyOptions={currencyOptions} onGoalClick={handleEditGoal} />
        <FinancialHealthCard score={financialHealth?.score ?? 0} trend={financialHealth?.trend} mobile onLearnClick={() => setFinancialHealthModalOpen(true)} />
        <UpcomingBillsCard bills={upcomingBills} onItemClick={handleUpcomingBillClick} />
        <TransactionsCard transactions={transactions} onRefresh={fetchDashboardData} />
        <UpdateCard date={update.date} message={update.message} highlight={update.highlight} link={update.link} linkHref="/statistics" />
        <InsightCard insight={roundupInsight ?? emptyRoundupInsight()} shortRow />
        <InvestmentsCard investments={investments} />
        <TopExpensesCard expenses={topExpenses} />
      </div>

      {/* Medium Layout */}
      <div className="hidden md:grid 2xl:hidden md:grid-cols-2 md:gap-4 md:px-6 md:pb-6">
        <IncomeCard amount={income.amount} trend={income.trend} comparisonLabel={income.comparisonLabel} />
        <ExpenseCard amount={expenses.amount} trend={expenses.trend} comparisonLabel={expenses.comparisonLabel} />
        <InsightCard insight={roundupInsight ?? emptyRoundupInsight()} minimal />
        <FinancialHealthCard score={financialHealth?.score ?? 0} trend={financialHealth?.trend} minimal onLearnClick={() => setFinancialHealthModalOpen(true)} />
        <GoalsCard goals={goals} currencyOptions={currencyOptions} onGoalClick={handleEditGoal} />
        <UpcomingBillsCard bills={upcomingBills} onItemClick={handleUpcomingBillClick} />
        <TransactionsCard transactions={transactions} onRefresh={fetchDashboardData} />
        <TopExpensesCard expenses={topExpenses} />
        <div className="col-span-2"><InvestmentsCard investments={investments} /></div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden 2xl:grid 2xl:grid-cols-4 2xl:gap-4 2xl:px-6 2xl:pb-6">
        <div className="col-span-3 flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
              <UpdateCard date={update.date} message={update.message} highlight={update.highlight} link={update.link} />
            </div>
            <div className="flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
              <IncomeCard amount={income.amount} trend={income.trend} comparisonLabel={income.comparisonLabel} />
            </div>
            <div className="flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
              <ExpenseCard amount={expenses.amount} trend={expenses.trend} comparisonLabel={expenses.comparisonLabel} />
            </div>
          </div>
          <div className="grid grid-cols-5 gap-4 flex-1">
            <div className="col-span-2 flex flex-col gap-4">
              <div className="flex-[7] min-h-0 flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
                <TransactionsCard transactions={transactions} onRefresh={fetchDashboardData} />
              </div>
              <div className="min-h-0 flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
                <InsightCard insight={roundupInsight ?? emptyRoundupInsight()} />
              </div>
            </div>
            <div className="col-span-3 flex flex-col gap-4">
              <div className="grid grid-cols-5 gap-4">
                <div className="col-span-3 flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
                  <GoalsCard goals={goals} currencyOptions={currencyOptions} onGoalClick={handleEditGoal} />
                </div>
                <div className="col-span-2 flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
                  <FinancialHealthCard score={financialHealth?.score ?? 0} trend={financialHealth?.trend} onLearnClick={() => setFinancialHealthModalOpen(true)} />
                </div>
              </div>
              <div className="flex-1 min-h-0 flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
                <InvestmentsCard investments={investments} />
              </div>
            </div>
          </div>
        </div>
        <div className="col-span-1 flex flex-col gap-4">
          <div className="flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
            <UpcomingBillsCard bills={upcomingBills} onItemClick={handleUpcomingBillClick} />
          </div>
          <div className="flex-1 min-h-0 flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
            <TopExpensesCard expenses={topExpenses} />
          </div>
        </div>
      </div>

      {/* Modals */}
      {selectedGoal && currencyOptions.length > 0 && (
        <GoalModal goal={selectedGoal} mode={modalMode} currencyOptions={currencyOptions} onClose={() => setSelectedGoal(null)} onSave={handleSave} onDelete={handleDeleteGoal} isSaving={isSaving} />
      )}
      {selectedTransaction && categories.length > 0 && currencyOptions.length > 0 && (
        <TransactionModal transaction={selectedTransaction} mode="edit" onClose={() => setSelectedTransaction(null)} onSave={handleTransactionSave} onDelete={handleTransactionDelete} onPauseResume={handlePauseResume} isSaving={isSaving} isDeleting={isDeleting} categories={categories} currencyOptions={currencyOptions} currencyOptionsLoading={currencyOptionsLoading} />
      )}
      <FinancialHealthModal isOpen={financialHealthModalOpen} onClose={() => setFinancialHealthModalOpen(false)} initialData={financialHealth} />
      {showConfetti && <Confetti onComplete={() => setShowConfetti(false)} />}
    </main>
  );
}

