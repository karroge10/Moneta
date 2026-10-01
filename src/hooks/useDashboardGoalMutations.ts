'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Goal } from '@/types/dashboard';
import { apiFetch } from '@/lib/api-client';
import { API, queryKeys } from '@/lib/query-keys';

/** Save and delete for goals edited from the dashboard Goals card. */
export function useDashboardGoalMutations() {
  const queryClient = useQueryClient();
  const onSuccess = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.statistics.all }),
    ]);

  const save = useMutation({ mutationFn: saveGoal, onSuccess });
  const remove = useMutation({ mutationFn: deleteGoal, onSuccess });

  return { save, remove };
}

async function saveGoal({ goal, isNew }: { goal: Goal; isNew: boolean }): Promise<void> {
  const body = {
    id: isNew ? undefined : goal.id,
    name: goal.name,
    targetDate: goal.targetDate,
    targetAmount: goal.targetAmount,
    currentAmount: goal.currentAmount,
    currencyId: goal.currencyId ?? undefined,
  };
  await apiFetch(API.goals, { method: isNew ? 'POST' : 'PUT', body });
}

async function deleteGoal(goalId: string): Promise<void> {
  await apiFetch(API.goals, { method: 'DELETE', params: { id: goalId } });
}
