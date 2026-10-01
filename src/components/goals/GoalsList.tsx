'use client';

import { useState } from 'react';
import { Goal } from '@/types/dashboard';
import { GoalStatus, filterGoals } from '@/lib/goalUtils';
import SearchBar from '@/components/transactions/shared/SearchBar';
import GoalFilter from './shared/GoalFilter';
import GoalCard from './GoalCard';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import Skeleton from '@/components/ui/Skeleton';
import type { CurrencyOption } from '@/lib/currency-country-map';

const SKELETON_CARDS = [0, 1, 2, 3];

interface GoalsListProps {
  goals: Goal[];
  currencyOptions?: CurrencyOption[];
  onGoalClick?: (goal: Goal) => void;
  loading?: boolean;
}

export default function GoalsList({ goals, currencyOptions = [], onGoalClick, loading = false }: GoalsListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<GoalStatus | 'all' | null>('all');

  const filteredGoals = filterGoals(goals, searchQuery, statusFilter);

  if (loading) {
    return (
      <Card title="Your Goals" className="h-full flex flex-col">
        <div className="mt-4 flex min-h-0 flex-1 flex-col gap-4" aria-busy="true">
          <div className="flex shrink-0 gap-3">
            <Skeleton className="h-10 flex-[0.6] rounded-full" />
            <Skeleton className="h-10 flex-[0.4] rounded-full" />
          </div>
          <div className="custom-scrollbar mb-4 min-h-0 flex-1 overflow-y-auto pr-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {SKELETON_CARDS.map((card) => (
                <div key={card} className="flex flex-col gap-4 rounded-card bg-surface-0 p-6">
                  <Skeleton className="h-6 w-3/4" />
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-6 w-20" />
                  </div>
                  <Skeleton className="h-12 w-2/3" />
                  <Skeleton className="h-2 w-full rounded-full" />
                  <Skeleton className="mt-auto h-4 w-2/3" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    );
  }

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
            <EmptyState title="No goals yet" description="Add a goal to get started" />
          ) : filteredGoals.length === 0 ? (
            <EmptyState title="No goals found" description="Try adjusting your search or filters" />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredGoals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  currencyOptions={currencyOptions}
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

