'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import MobileNavbar from '@/components/MobileNavbar';
import GoalsList from '@/components/goals/GoalsList';
import GoalsSummary from '@/components/goals/GoalsSummary';
import GoalModal from '@/components/goals/GoalModal';
import Confetti from '@/components/ui/Confetti';
import { Goal } from '@/types/dashboard';
import { TimePeriod } from '@/types/dashboard';

export default function GoalsPage() {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('This Year');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  
  // Modal state
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [isSaving, setIsSaving] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const fetchGoals = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/goals');
      
      if (!response.ok) {
        throw new Error('Failed to fetch goals');
      }
      
      const data = await response.json();
      setGoals(data.goals || []);
    } catch (err) {
      console.error('Error fetching goals:', err);
      setError(err instanceof Error ? err.message : 'Failed to load goals');
      setGoals([]);
    } finally {
      setLoading(false);
    }
  }, []);

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

  if (error && goals.length === 0) {
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
      {error && (
        <div className="px-4 md:px-6 pt-4">
          <div className="bg-[#D93F3F] text-[#E7E4E4] px-4 py-2 rounded-xl text-sm">
            {error}
          </div>
        </div>
      )}

      {/* Content — same layout when loading; cards show skeleton internally */}
      {/* Mobile: stacked (prioritize goals first) */}
      <div className="md:hidden flex flex-col gap-4 px-4 pb-4">
        <GoalsList goals={goals} onGoalClick={handleEditGoal} loading={loading} />
        <GoalsSummary goals={goals} compact loading={loading} />
      </div>

      {/* Tablet & small desktop (< xl): vertical flow with goals first */}
      <div className="hidden md:flex xl:hidden flex-col gap-4 md:px-6 md:pb-6">
        <GoalsList goals={goals} onGoalClick={handleEditGoal} loading={loading} />
        <GoalsSummary goals={goals} compact loading={loading} />
      </div>

      {/* Desktop: generous canvas */}
      <div className="hidden xl:grid xl:grid-cols-3 xl:gap-4 xl:px-6 xl:pb-6">
        <div className="col-span-2 min-h-0 flex flex-col">
          <GoalsList goals={goals} onGoalClick={handleEditGoal} loading={loading} />
        </div>
        <div className="min-h-0 flex flex-col">
          <GoalsSummary goals={goals} loading={loading} />
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
