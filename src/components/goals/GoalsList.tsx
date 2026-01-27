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
  onGoalClick?: (goal: Goal) => void;
}

export default function GoalsList({ goals, onGoalClick }: GoalsListProps) {
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
          {goals.length === 0 ? (
            // Loading skeleton - show skeleton goal cards
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div
                  key={idx}
                  className="flex flex-col p-6 rounded-[30px] gap-4 animate-pulse"
                  style={{ backgroundColor: '#202020' }}
                >
                  <div className="h-6 w-3/4 rounded" style={{ backgroundColor: '#3a3a3a' }}></div>
                  <div className="flex items-center justify-between">
                    <div className="h-4 w-24 rounded" style={{ backgroundColor: '#3a3a3a' }}></div>
                    <div className="h-6 w-20 rounded-lg" style={{ backgroundColor: '#3a3a3a' }}></div>
                  </div>
                  <div className="h-12 w-2/3 rounded" style={{ backgroundColor: '#3a3a3a' }}></div>
                  <div className="h-2 w-full rounded-full" style={{ backgroundColor: '#3a3a3a' }}></div>
                  <div className="h-4 w-2/3 rounded mt-auto" style={{ backgroundColor: '#3a3a3a' }}></div>
                </div>
              ))}
            </div>
          ) : filteredGoals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="text-body mb-2 opacity-70">No goals found</div>
              <div className="text-helper">Try adjusting your search or filters</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredGoals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onClick={() => onGoalClick?.(goal)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

