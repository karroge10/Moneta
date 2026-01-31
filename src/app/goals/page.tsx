'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import MobileNavbar from '@/components/MobileNavbar';
import GoalsList from '@/components/goals/GoalsList';
import GoalsSummary from '@/components/goals/GoalsSummary';
import GoalModal from '@/components/goals/GoalModal';
import Confetti from '@/components/ui/Confetti';
import { ToastContainer, type ToastType } from '@/components/ui/Toast';
import { Goal } from '@/types/dashboard';
import { TimePeriod } from '@/types/dashboard';
import { useCurrency } from '@/hooks/useCurrency';
import { useCurrencyOptions } from '@/hooks/useCurrencyOptions';

export default function GoalsPage() {
  const { currency: userCurrency } = useCurrency();
  const { currencyOptions } = useCurrencyOptions();
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('This Year');
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type?: ToastType }>>([]);

  const addToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);
  
  // Modal state
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [isSaving, setIsSaving] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const fetchGoals = useCallback(async () => {
    try {
      setLoading(true);
      setFetchError(false);
      const res = await fetch('/api/goals');
      
      if (!res.ok) {
        throw new Error('Failed to fetch goals');
      }
      
      const data = await res.json();
      setGoals(data.goals || []);
    } catch (err) {
      console.error('Error fetching goals:', err);
      setFetchError(true);
      setGoals([]);
      addToast(err instanceof Error ? err.message : 'Failed to load goals', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  // Create draft goal for adding
  const createDraftGoal = (): Goal => {
    const today = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = today.getDate();
    const month = months[today.getMonth()];
    const year = today.getFullYear();
    const suffix = day === 1 || day === 21 || day === 31 ? 'st' :
                   day === 2 || day === 22 ? 'nd' :
                   day === 3 || day === 23 ? 'rd' : 'th';
    
    return {
      id: crypto.randomUUID(),
      name: '',
      targetDate: `${month} ${day}${suffix} ${year}`,
      targetAmount: 0,
      currentAmount: 0,
      progress: 0,
      currencyId: userCurrency?.id ?? undefined,
    };
  };

  const handleAddGoalClick = () => {
    setModalMode('add');
    setSelectedGoal(createDraftGoal());
  };

  const handleEditGoal = (goal: Goal) => {
    setModalMode('edit');
    setSelectedGoal(goal);
  };

  const handleSave = async (updatedGoal: Goal) => {
    try {
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
      
      let res: Response;
      if (isNew) {
        res = await fetch('/api/goals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: updatedGoal.name,
            targetDate: updatedGoal.targetDate,
            targetAmount: updatedGoal.targetAmount,
            currentAmount: updatedGoal.currentAmount,
            currencyId: updatedGoal.currencyId ?? undefined,
          }),
        });
      } else {
        res = await fetch('/api/goals', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: updatedGoal.id,
            name: updatedGoal.name,
            targetDate: updatedGoal.targetDate,
            targetAmount: updatedGoal.targetAmount,
            currentAmount: updatedGoal.currentAmount,
            currencyId: updatedGoal.currencyId ?? undefined,
          }),
        });
      }
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to save goal');
      }
      
      setSelectedGoal(null);
      addToast('Goal saved');
      
      // Show confetti if goal was just completed
      if (justCompleted || (isNew && isNowComplete)) {
        setShowConfetti(true);
      }
      
      fetchGoals(); // Refresh goals data
    } catch (err) {
      console.error('Error saving goal:', err);
      addToast(err instanceof Error ? err.message : 'Failed to save goal', 'error');
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
      addToast('Goal deleted');
      fetchGoals(); // Refresh goals data
    } catch (err) {
      console.error('Error deleting goal:', err);
      addToast(err instanceof Error ? err.message : 'Failed to delete goal', 'error');
    }
  };

  if (fetchError && goals.length === 0) {
    return (
      <main className="min-h-screen bg-[#202020]">
        <div className="hidden md:block">
          <DashboardHeader pageName="Goals" actionButton={{ label: 'Add Goal', onClick: handleAddGoalClick }} />
        </div>
        <div className="md:hidden">
          <MobileNavbar pageName="Goals" timePeriod={timePeriod} onTimePeriodChange={setTimePeriod} activeSection="goals" />
        </div>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
          <button
            onClick={() => fetchGoals()}
            className="px-4 py-2 rounded-full bg-[#AC66DA] text-[#E7E4E4] text-body font-medium hover:opacity-90 transition-opacity"
          >
            Retry
          </button>
        </div>
        <ToastContainer toasts={toasts} onRemove={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#202020]">
      {/* Desktop Header */}
      <div className="hidden md:block">
        <DashboardHeader 
          pageName="Goals"
          actionButton={{
            label: 'Add Goal',
            onClick: handleAddGoalClick,
          }}
        />
      </div>

      {/* Mobile Navbar */}
      <div className="md:hidden">
        <MobileNavbar 
          pageName="Goals" 
          timePeriod={timePeriod} 
          onTimePeriodChange={setTimePeriod}
          activeSection="goals"
        />
      </div>

      {/* Error Banner */}
      {/* Content — same layout when loading; cards show skeleton internally */}
      {/* Mobile: stacked (prioritize goals first) */}
      <div className="md:hidden flex flex-col gap-4 px-4 pb-4">
        <GoalsList goals={goals} currencyOptions={currencyOptions} onGoalClick={handleEditGoal} loading={loading} />
        <GoalsSummary goals={goals} compact loading={loading} />
      </div>

      {/* Tablet & small desktop (< xl): vertical flow with goals first */}
      <div className="hidden md:flex xl:hidden flex-col gap-4 md:px-6 md:pb-6">
        <GoalsList goals={goals} currencyOptions={currencyOptions} onGoalClick={handleEditGoal} loading={loading} />
        <GoalsSummary goals={goals} compact loading={loading} />
      </div>

      {/* Desktop: generous canvas */}
      <div className="hidden xl:grid xl:grid-cols-3 xl:gap-4 xl:px-6 xl:pb-6">
        <div className="col-span-2 min-h-0 flex flex-col">
          <GoalsList goals={goals} currencyOptions={currencyOptions} onGoalClick={handleEditGoal} loading={loading} />
        </div>
        <div className="min-h-0 flex flex-col">
          <GoalsSummary goals={goals} loading={loading} />
        </div>
      </div>

      {/* Goal Modal */}
      {selectedGoal && currencyOptions.length > 0 && (
        <GoalModal
          goal={selectedGoal}
          mode={modalMode}
          currencyOptions={currencyOptions}
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

      <ToastContainer toasts={toasts} onRemove={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </main>
  );
}
