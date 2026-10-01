import type { Prisma } from '@prisma/client';
import { calculateGoalProgress } from '@/lib/goalUtils';

type GoalAmounts = { currentAmount: Prisma.Decimal; targetAmount: Prisma.Decimal };

export function countCompletedGoals(goals: GoalAmounts[]): number {
  return goals.filter((g) => calculateGoalProgress(g.currentAmount, g.targetAmount) >= 100).length;
}

/** Percentage of completed goals rounded to one decimal, 0 when there are no goals. */
export function getGoalsSuccessRate(goals: GoalAmounts[]): number {
  if (goals.length === 0) return 0;
  const completed = countCompletedGoals(goals);
  return Math.round((completed / goals.length) * 100 * 10) / 10;
}
