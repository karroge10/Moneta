'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import { API, queryKeys } from '@/lib/query-keys';
import { useAuthReadyForApi } from '@/hooks/useAuthReadyForApi';
import type { Goal } from '@/types/dashboard';

/** The signed-in user's goals. */
export function useGoals() {
  const authReady = useAuthReadyForApi();
  return useQuery({
    queryKey: queryKeys.goals.list(),
    queryFn: () => apiFetch<{ goals?: Goal[] }>(API.goals),
    select: (data) => data.goals ?? [],
    enabled: authReady,
  });
}

/** Creates (`isNew`) or updates a goal. */
export function useSaveGoal() {
  const invalidate = useInvalidateGoals();
  return useMutation({
    mutationFn: ({ goal, isNew }: { goal: Goal; isNew: boolean }) => {
      const body = toGoalBody(goal, isNew);
      return apiFetch(API.goals, { method: isNew ? 'POST' : 'PUT', body });
    },
    onSuccess: invalidate,
  });
}

/** Deletes a goal by id. */
export function useDeleteGoal() {
  const invalidate = useInvalidateGoals();
  return useMutation({
    mutationFn: (goalId: string) => apiFetch(API.goals, { method: 'DELETE', params: { id: goalId } }),
    onSuccess: invalidate,
  });
}

function useInvalidateGoals() {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
    ]);
  };
}

function toGoalBody(goal: Goal, isNew: boolean): Record<string, unknown> {
  const fields = {
    name: goal.name,
    targetDate: goal.targetDate,
    targetAmount: goal.targetAmount,
    currentAmount: goal.currentAmount,
    currencyId: goal.currencyId ?? undefined,
  };
  return isNew ? fields : { id: goal.id, ...fields };
}
