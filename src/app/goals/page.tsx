'use client';

import { useState } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import MobileNavbar from '@/components/MobileNavbar';
import GoalsList from '@/components/goals/GoalsList';
import GoalsSummary from '@/components/goals/GoalsSummary';
import { mockGoals } from '@/lib/mockData';
import { Goal } from '@/types/dashboard';
import { TimePeriod } from '@/types/dashboard';

export default function GoalsPage() {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('This Year');
  const [goals] = useState(mockGoals);

  const handleGoalOptionsClick = (goal: Goal) => {
    console.log('Goal options clicked:', goal);
    // TODO: Implement goal options menu
  };

  return (
    <main className="min-h-screen bg-[#202020]">
      {/* Desktop Header */}
      <div className="hidden md:block">
        <DashboardHeader 
          pageName="Goals"
          actionButton={{
            label: 'Add Goal',
            onClick: () => console.log('Add goal'),
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

      {/* Content */}
      <div className="flex flex-col md:grid md:grid-cols-[7fr_3fr] gap-4 px-4 md:px-6 pb-6">
        <div className="min-h-0">
          <GoalsList
            goals={goals}
            onGoalOptionsClick={handleGoalOptionsClick}
          />
        </div>
        
        <div className="min-h-0">
          <GoalsSummary goals={goals} />
        </div>
      </div>
    </main>
  );
}

