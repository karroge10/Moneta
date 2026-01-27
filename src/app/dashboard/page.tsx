'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import MobileNavbar from '@/components/MobileNavbar';
import UpdateCard from '@/components/dashboard/UpdateCard';
import IncomeCard from '@/components/dashboard/IncomeCard';
import ExpenseCard from '@/components/dashboard/ExpenseCard';
import UpcomingBillsCard from '@/components/dashboard/UpcomingBillsCard';
import TransactionsCard from '@/components/dashboard/TransactionsCard';
import GoalsCard from '@/components/dashboard/GoalsCard';
import FinancialHealthCard from '@/components/dashboard/FinancialHealthCard';
import InvestmentsCard from '@/components/dashboard/InvestmentsCard';
import InsightCard from '@/components/dashboard/InsightCard';
import TopExpensesCard from '@/components/dashboard/TopExpensesCard';
import CardSkeleton from '@/components/dashboard/CardSkeleton';
import GoalModal from '@/components/goals/GoalModal';
import Confetti from '@/components/ui/Confetti';
import { getGoalStatus } from '@/lib/goalUtils';
import { Transaction, ExpenseCategory, TimePeriod, Goal, Investment, Bill } from '@/types/dashboard';
import {
  mockUpdate,
  mockFinancialHealth,
  mockInsight,
} from '@/lib/mockData';

export default function DashboardPage() {
  const [income, setIncome] = useState({ amount: 0, trend: 0, comparisonLabel: '' });
  const [expenses, setExpenses] = useState({ amount: 0, trend: 0, comparisonLabel: '' });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [topExpenses, setTopExpenses] = useState<ExpenseCategory[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [upcomingBills, setUpcomingBills] = useState<Bill[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('This Month');
  
  // Goal modal state
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('edit');
  const [isSaving, setIsSaving] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  
  // Keep mock data for other components (not requested to be changed)
  const update = mockUpdate;
  const financialHealth = mockFinancialHealth;
  const insight = mockInsight;
  
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ timePeriod });
      const response = await fetch(`/api/dashboard?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      
      const data = await response.json();
      console.log('[dashboard] Received data:', data);
      console.log('[dashboard] Income:', data.income);
      console.log('[dashboard] Expenses:', data.expenses);
      console.log('[dashboard] Income comparisonLabel:', data.income?.comparisonLabel);
      console.log('[dashboard] Expenses comparisonLabel:', data.expenses?.comparisonLabel);
      setIncome({
        amount: data.income?.amount || 0,
        trend: data.income?.trend || 0,
        comparisonLabel: data.income?.comparisonLabel || '',
      });
      setExpenses({
        amount: data.expenses?.amount || 0,
        trend: data.expenses?.trend || 0,
        comparisonLabel: data.expenses?.comparisonLabel || '',
      });
      setTransactions(data.transactions || []);
      setTopExpenses(data.topExpenses || []);
      setInvestments(data.investments || []);

      const upcomingResponse = await fetch('/api/recurring?type=expense&upcoming=true');
      if (upcomingResponse.ok) {
        const upcomingData = await upcomingResponse.json();
        const normalizedBills: Bill[] = (upcomingData.upcoming || []).map((bill: any) => ({
          id: bill.id,
          name: bill.name,
          date: bill.date,
          amount: bill.amount,
          category: bill.category || 'Uncategorized',
          icon: bill.icon || 'HelpCircle',
        }));
        setUpcomingBills(normalizedBills);
      } else {
        setUpcomingBills([]);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      // Set empty defaults on error
      setIncome({ amount: 0, trend: 0, comparisonLabel: '' });
      setExpenses({ amount: 0, trend: 0, comparisonLabel: '' });
      setTransactions([]);
      setTopExpenses([]);
      setInvestments([]);
      setUpcomingBills([]);
    } finally {
      setLoading(false);
    }
  }, [timePeriod]);

  // Fetch goals separately - filter out completed goals
  const fetchGoals = useCallback(async () => {
    try {
      const response = await fetch('/api/goals');
      if (response.ok) {
        const data = await response.json();
        // Filter out completed goals for dashboard
        const activeGoals = (data.goals || []).filter((goal: Goal) => getGoalStatus(goal) !== 'completed');
        setGoals(activeGoals);
      }
    } catch (err) {
      console.error('Error fetching goals:', err);
      setGoals([]);
    }
  }, []);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const handleEditGoal = (goal: Goal) => {
    setModalMode('edit');
    setSelectedGoal(goal);
  };

  const handleSave = async (updatedGoal: Goal) => {
    try {
      setError(null);
      setIsSaving(true);
      
      // Calculate progress to check if goal is complete
      const calculatedProgress = updatedGoal.targetAmount > 0 
        ? (updatedGoal.currentAmount / updatedGoal.targetAmount) * 100 
        : 0;
      const isNowComplete = calculatedProgress >= 100;
      
      // Check if goal was previously incomplete and is now complete
      const wasIncomplete = selectedGoal ? selectedGoal.progress < 100 : true;
      const justCompleted = wasIncomplete && isNowComplete;
      
      const isNew = modalMode === 'add';
      
      let response: Response;
      if (isNew) {
        response = await fetch('/api/goals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: updatedGoal.name,
            targetDate: updatedGoal.targetDate,
            targetAmount: updatedGoal.targetAmount,
            currentAmount: updatedGoal.currentAmount,
          }),
        });
      } else {
        response = await fetch('/api/goals', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: updatedGoal.id,
            name: updatedGoal.name,
            targetDate: updatedGoal.targetDate,
            targetAmount: updatedGoal.targetAmount,
            currentAmount: updatedGoal.currentAmount,
          }),
        });
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save goal');
      }
      
      setSelectedGoal(null);
      
      // Show confetti if goal was just completed
      if (justCompleted || (isNew && isNowComplete)) {
        setShowConfetti(true);
      }
      
      fetchGoals(); // Refresh goals data
    } catch (err) {
      console.error('Error saving goal:', err);
      setError(err instanceof Error ? err.message : 'Failed to save goal');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCloseModal = () => {
    setSelectedGoal(null);
  };

  const handleDelete = async () => {
    if (!selectedGoal) return;
    
    try {
      const response = await fetch(`/api/goals?id=${selectedGoal.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete goal');
      }
      
      setSelectedGoal(null);
      fetchGoals(); // Refresh goals data
    } catch (err) {
      console.error('Error deleting goal:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete goal');
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Helper to render skeleton layout
  const renderSkeletonLayout = () => (
    <>
      {/* Mobile: Custom Layout (< 768px) */}
      <div className="flex flex-col gap-4 px-4 pb-4 md:hidden">
        <div className="grid grid-cols-2 gap-4">
          <CardSkeleton title="Income" variant="value" />
          <CardSkeleton title="Expenses" variant="value" />
        </div>
        <CardSkeleton title="Goals" variant="goal" />
        <CardSkeleton title="Financial Health" variant="health" />
        <CardSkeleton title="Upcoming Bills" variant="list" />
        <CardSkeleton title="Transactions" variant="list" />
        <CardSkeleton title="Update" variant="update" />
        <CardSkeleton title="Insight" variant="value" />
        <CardSkeleton title="Investments" variant="list" />
        <CardSkeleton title="Top Expenses" variant="chart" />
      </div>

      {/* Two-column layout: 768px - 1536px */}
      <div className="hidden md:grid 2xl:hidden md:grid-cols-2 md:gap-4 md:px-6 md:pb-6">
        <CardSkeleton title="Income" variant="value" />
        <CardSkeleton title="Expenses" variant="value" />
        <CardSkeleton title="Insight" variant="value" />
        <CardSkeleton title="Financial Health" variant="health" />
        <CardSkeleton title="Goals" variant="goal" />
        <CardSkeleton title="Upcoming Bills" variant="list" />
        <CardSkeleton title="Transactions" variant="list" />
        <CardSkeleton title="Top Expenses" variant="chart" />
        <div className="col-span-2">
          <CardSkeleton title="Investments" variant="list" />
        </div>
      </div>

      {/* Desktop: Pure Tailwind Bento Grid */}
      <div className="hidden 2xl:grid 2xl:grid-cols-4 2xl:gap-4 2xl:px-6 2xl:pb-6">
        <div className="col-span-3 flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
              <CardSkeleton title="Update" variant="update" />
            </div>
            <div className="flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
              <CardSkeleton title="Income" variant="value" />
            </div>
            <div className="flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
              <CardSkeleton title="Expenses" variant="value" />
            </div>
          </div>
          <div className="grid grid-cols-5 gap-4">
            <div className="col-span-2 flex flex-col gap-4">
              <div className="flex-[7] min-h-0 flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
                <CardSkeleton title="Transactions" variant="list" />
              </div>
              <div className="min-h-0 flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
                <CardSkeleton title="Insight" variant="value" />
              </div>
            </div>
            <div className="col-span-3 flex flex-col gap-4">
              <div className="grid grid-cols-5 gap-4">
                <div className="col-span-3 flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
                  <CardSkeleton title="Goals" variant="goal" />
                </div>
                <div className="col-span-2 flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
                  <CardSkeleton title="Financial Health" variant="health" />
                </div>
              </div>
              <div className="flex-1 min-h-0 flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
                <CardSkeleton title="Investments" variant="list" />
              </div>
            </div>
          </div>
        </div>
        <div className="col-span-1 flex flex-col gap-4">
          <div className="flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
            <CardSkeleton title="Upcoming Bills" variant="list" />
          </div>
          <div className="flex-1 min-h-0 flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
            <CardSkeleton title="Top Expenses" variant="chart" />
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
            timePeriod={timePeriod}
            onTimePeriodChange={setTimePeriod}
          />
        </div>

        {/* Mobile Navbar */}
        <div className="md:hidden">
          <MobileNavbar 
            pageName="Dashboard" 
            activeSection="dashboard"
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
            timePeriod={timePeriod}
            onTimePeriodChange={setTimePeriod}
          />
        </div>

        {/* Mobile Navbar */}
        <div className="md:hidden">
          <MobileNavbar 
            pageName="Dashboard" 
            activeSection="dashboard"
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
          timePeriod={timePeriod}
          onTimePeriodChange={setTimePeriod}
        />
      </div>

      {/* Mobile Navbar */}
      <div className="md:hidden">
        <MobileNavbar 
          pageName="Dashboard" 
          activeSection="dashboard"
        />
      </div>

      {/* Mobile: Custom Layout (< 768px) */}
      <div className="flex flex-col gap-4 px-4 pb-4 md:hidden">
        {/* Income | Expenses 50/50 */}
        <div className="grid grid-cols-2 gap-4">
          <IncomeCard amount={income.amount} trend={income.trend} comparisonLabel={income.comparisonLabel} />
          <ExpenseCard amount={expenses.amount} trend={expenses.trend} comparisonLabel={expenses.comparisonLabel} />
        </div>

        {/* Goals full width */}
        <GoalsCard goals={goals} onGoalClick={handleEditGoal} />

        {/* Financial Health short row */}
        <FinancialHealthCard score={financialHealth} mobile />

        {/* Upcoming Bills full width */}
        <UpcomingBillsCard bills={upcomingBills} />

        {/* Transactions full width */}
        <TransactionsCard transactions={transactions} onRefresh={fetchDashboardData} />

        {/* Update Card */}
        <UpdateCard
          date={update.date}
          message={update.message}
          highlight={update.highlight}
          link={update.link}
          linkHref="/statistics"
        />

        {/* Insight short row */}
        <InsightCard
          title={insight.title}
          amount={insight.amount}
          message={insight.message}
          investmentAmount={insight.investmentAmount}
          trend={insight.trend}
          shortRow
        />

        {/* Investments */}
        <InvestmentsCard investments={investments} />

        {/* Top Expenses */}
        <TopExpensesCard expenses={topExpenses} />
      </div>

      {/* Two-column layout: 768px - 1536px */}
      <div className="hidden md:grid 2xl:hidden md:grid-cols-2 md:gap-4 md:px-6 md:pb-6">
        <IncomeCard amount={income.amount} trend={income.trend} comparisonLabel={income.comparisonLabel} />
        <ExpenseCard amount={expenses.amount} trend={expenses.trend} comparisonLabel={expenses.comparisonLabel} />
        <InsightCard
          title={insight.title}
          amount={insight.amount}
          message={insight.message}
          investmentAmount={insight.investmentAmount}
          trend={insight.trend}
          minimal
        />
        <FinancialHealthCard score={financialHealth} minimal />
        <GoalsCard goals={goals} onGoalClick={handleEditGoal} />
        <UpcomingBillsCard bills={upcomingBills} />
        <TransactionsCard transactions={transactions} onRefresh={fetchDashboardData} />
        <TopExpensesCard expenses={topExpenses} />
        <div className="col-span-2">
          <InvestmentsCard investments={investments} />
        </div>
      </div>

      {/* Desktop: Pure Tailwind Bento Grid */}
      <div className="hidden 2xl:grid 2xl:grid-cols-4 2xl:gap-4 2xl:px-6 2xl:pb-6">
        {/* Grid 1: Left side (3 columns) */}
        <div className="col-span-3 flex flex-col gap-4">
          {/* Row 1: Update, Income, Expense - equal width */}
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
              <UpdateCard
                date={update.date}
                message={update.message}
                highlight={update.highlight}
                link={update.link}
              />
            </div>
            <div className="flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
              <IncomeCard amount={income.amount} trend={income.trend} comparisonLabel={income.comparisonLabel} />
            </div>
            <div className="flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
              <ExpenseCard amount={expenses.amount} trend={expenses.trend} comparisonLabel={expenses.comparisonLabel} />
            </div>
          </div>

          {/* Row 2: Sub-bento grid */}
          <div className="grid grid-cols-5 gap-4">
            {/* Left column (2 cols): Transactions + Insight stacked */}
            <div className="col-span-2 flex flex-col gap-4">
              <div className="flex-[7] min-h-0 flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
                <TransactionsCard transactions={transactions} onRefresh={fetchDashboardData} />
              </div>
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

            {/* Right column (3 cols): Goals + Financial Health + Investments */}
            <div className="col-span-3 flex flex-col gap-4">
              {/* Top row: Goals + Financial Health side-by-side */}
              <div className="grid grid-cols-5 gap-4">
                <div className="col-span-3 flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
                  <GoalsCard goals={goals} onGoalClick={handleEditGoal} />
                </div>
                <div className="col-span-2 flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
                  <FinancialHealthCard score={financialHealth} />
                </div>
              </div>
              
              {/* Bottom row: Investments fills remaining space */}
              <div className="flex-1 min-h-0 flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
                <InvestmentsCard investments={investments} />
              </div>
            </div>
          </div>
        </div>

        {/* Grid 2: Right side (1 column) - Upcoming Bills + Top Expenses */}
        <div className="col-span-1 flex flex-col gap-4">
          <div className="flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
            <UpcomingBillsCard bills={upcomingBills} />
          </div>
          <div className="flex-1 min-h-0 flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
            <TopExpensesCard expenses={topExpenses} />
          </div>
        </div>
      </div>

      {/* Goal Modal */}
      {selectedGoal && (
        <GoalModal
          goal={selectedGoal}
          mode={modalMode}
          onClose={handleCloseModal}
          onSave={handleSave}
          onDelete={handleDelete}
          isSaving={isSaving}
        />
      )}

      {/* Confetti */}
      {showConfetti && (
        <Confetti onComplete={() => setShowConfetti(false)} />
      )}
    </main>
  );
}

