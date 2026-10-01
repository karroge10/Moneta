'use client';

import { useState } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import MobileNavbar from '@/components/MobileNavbar';
import GoalsList from '@/components/goals/GoalsList';
import GoalsSummary from '@/components/goals/GoalsSummary';
import GoalModal from '@/components/goals/GoalModal';
import Confetti from '@/components/ui/Confetti';
import ErrorState from '@/components/ui/ErrorState';
import { useToast } from '@/contexts/ToastContext';
import { useCurrency } from '@/hooks/useCurrency';
import { useCurrencyOptions } from '@/hooks/useCurrencyOptions';
import { useDeleteGoal, useGoals, useSaveGoal } from '@/hooks/goals/useGoals';
import { formatDate } from '@/lib/format';
import type { Goal, TimePeriod } from '@/types/dashboard';

const EMPTY_GOALS: Goal[] = [];

export default function GoalsPage() {
  const { currency: userCurrency } = useCurrency();
  const { currencyOptions } = useCurrencyOptions();
  const { addToast } = useToast();
  const goalsQuery = useGoals();
  const saveGoal = useSaveGoal();
  const deleteGoal = useDeleteGoal();
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('This Year');
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [showConfetti, setShowConfetti] = useState(false);

  const goals = goalsQuery.data ?? EMPTY_GOALS;
  const loading = goalsQuery.isPending;

  const handleAddGoalClick = () => {
    setModalMode('add');
    setSelectedGoal(createDraftGoal(userCurrency?.id));
  };

  const handleEditGoal = (goal: Goal) => {
    setModalMode('edit');
    setSelectedGoal(goal);
  };

  const handleSave = async (updatedGoal: Goal) => {
    const isNew = modalMode === 'add';
    const isNowComplete = updatedGoal.targetAmount > 0 && updatedGoal.currentAmount / updatedGoal.targetAmount >= 1;
    const wasIncomplete = selectedGoal ? selectedGoal.progress < 100 : true;
    try {
      await saveGoal.mutateAsync({ goal: updatedGoal, isNew });
      setSelectedGoal(null);
      addToast('Goal saved');
      if (wasIncomplete && isNowComplete) setShowConfetti(true);
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Failed to save goal', 'error');
    }
  };

  const handleDelete = async () => {
    if (!selectedGoal) return;
    try {
      await deleteGoal.mutateAsync(selectedGoal.id);
      setSelectedGoal(null);
      addToast('Goal deleted');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Failed to delete goal', 'error');
    }
  };

  const showError = goalsQuery.isError && goals.length === 0;

  return (
    <main className="min-h-screen bg-background">
      <div className="hidden md:block">
        <DashboardHeader pageName="Goals" actionButton={{ label: 'Add Goal', onClick: handleAddGoalClick }} />
      </div>
      <div className="md:hidden">
        <MobileNavbar pageName="Goals" timePeriod={timePeriod} onTimePeriodChange={setTimePeriod} activeSection="goals" />
      </div>

      {showError ? (
        <div className="flex min-h-[60vh] items-center justify-center px-4">
          <ErrorState
            title="Could not load your goals"
            message={goalsQuery.error?.message}
            onRetry={() => goalsQuery.refetch()}
            retrying={goalsQuery.isFetching}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-4 px-4 pb-4 md:px-6 md:pb-6 xl:grid xl:grid-cols-3">
          <div className="flex min-h-0 flex-col xl:col-span-2">
            <GoalsList goals={goals} currencyOptions={currencyOptions} onGoalClick={handleEditGoal} loading={loading} />
          </div>
          <div className="flex min-h-0 flex-col">
            <GoalsSummary goals={goals} compact loading={loading} />
          </div>
        </div>
      )}

      {selectedGoal && currencyOptions.length > 0 && (
        <GoalModal
          goal={selectedGoal}
          mode={modalMode}
          currencyOptions={currencyOptions}
          onClose={() => setSelectedGoal(null)}
          onSave={handleSave}
          onDelete={handleDelete}
          isSaving={saveGoal.isPending || deleteGoal.isPending}
        />
      )}

      {showConfetti && <Confetti onComplete={() => setShowConfetti(false)} />}
    </main>
  );
}

/** Empty goal for the add dialog, due today, in the user's currency. */
function createDraftGoal(currencyId: number | undefined): Goal {
  return {
    id: crypto.randomUUID(),
    name: '',
    targetDate: formatDate(new Date(), 'ordinal'),
    targetAmount: 0,
    currentAmount: 0,
    progress: 0,
    currencyId,
  };
}
