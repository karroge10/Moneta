'use client';

import { useState } from 'react';
import { Goal } from '@/types/dashboard';
import { GoalStatus, filterGoals } from '@/lib/goalUtils';
import SearchBar from '@/components/transactions/shared/SearchBar';
import GoalFilter from './shared/GoalFilter';
import GoalCard from './GoalCard';
import Card from '@/components/ui/Card';

interface GoalsListProps {
  goals: Goal[];
  onGoalOptionsClick?: (goal: Goal) => void;
}

export default function GoalsList({ goals, onGoalOptionsClick }: GoalsListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<GoalStatus | 'all' | null>('all');

  const filteredGoals = filterGoals(goals, searchQuery, statusFilter);

  return (
    <Card title="Your Goals" className="h-full flex flex-col">
      <div className="flex flex-col gap-4 mt-4 flex-1 min-h-0">
        <div className="flex gap-3 shrink-0">
          <div className="flex-[0.6]">
            <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search..." />
          </div>
          <div className="flex-[0.4]">
            <GoalFilter 
              selectedStatus={statusFilter}
              onSelect={setStatusFilter}
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 min-h-0 mb-4">
          {filteredGoals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="text-body mb-2 opacity-70">No goals found</div>
              <div className="text-helper">Try adjusting your search or filters</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredGoals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onOptionsClick={() => onGoalOptionsClick?.(goal)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

