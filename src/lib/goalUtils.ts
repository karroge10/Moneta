import { Goal } from '@/types/dashboard';

export type GoalStatus = 'active' | 'completed' | 'failed';

/** Calculate progress percentage from current and target amounts. Used instead of storing in DB. */
export function calculateGoalProgress(currentAmount: number, targetAmount: number): number {
  if (targetAmount === 0) return 0;
  return Math.min(100, Math.round((currentAmount / targetAmount) * 100 * 10) / 10);
}

/**
 * Parse a date string like "Dec 25th 2024" into a Date object
 */
function parseTargetDate(dateStr: string): Date {
  // Handle formats like "Dec 25th 2024" or "Dec 25 2024"
  const cleaned = dateStr.replace(/(\d+)(st|nd|rd|th)/, '$1');
  return new Date(cleaned);
}

/**
 * Check if a target date has passed
 */
function isDatePassed(targetDate: string): boolean {
  try {
    const target = parseTargetDate(targetDate);
    const now = new Date();
    // Reset time to compare dates only
    target.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    return target < now;
  } catch {
    // If parsing fails, assume not passed
    return false;
  }
}

/**
 * Get the status of a goal
 */
export function getGoalStatus(goal: Goal): GoalStatus {
  if (goal.progress >= 100) {
    return 'completed';
  }
  if (isDatePassed(goal.targetDate) && goal.progress < 100) {
    return 'failed';
  }
  return 'active';
}

/**
 * Filter goals by search query and status
 */
export function filterGoals(
  goals: Goal[],
  searchQuery: string,
  statusFilter: GoalStatus | 'all' | null
): Goal[] {
  return goals.filter(goal => {
    // Search filter
    const matchesSearch = !searchQuery || 
      goal.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      goal.targetDate.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Status filter
    const matchesStatus = !statusFilter || statusFilter === 'all' || getGoalStatus(goal) === statusFilter;
    
    return matchesSearch && matchesStatus;
  });
}

/**
 * Summary statistics for goals
 */
export interface GoalSummaryStats {
  activeGoals: number;
  completedGoals: number;
  failedGoals: number;
  successRate: number;
  totalGoals: number;
  completionsLast30d: number;
  averageTimeToComplete: number | null; // in days
  totalMoneySaved: number;
}

/**
 * Calculate summary statistics from goals array
 */
export function calculateSummaryStats(goals: Goal[]): GoalSummaryStats {
  const stats: GoalSummaryStats = {
    activeGoals: 0,
    completedGoals: 0,
    failedGoals: 0,
    successRate: 0,
    totalGoals: goals.length,
    completionsLast30d: 0,
    averageTimeToComplete: null,
    totalMoneySaved: 0,
  };

  const completedGoals: Goal[] = [];
  const completionDates: Date[] = [];
  const completionDurations: number[] = [];

  goals.forEach(goal => {
    const status = getGoalStatus(goal);
    if (status === 'active') stats.activeGoals++;
    else if (status === 'completed') {
      stats.completedGoals++;
      completedGoals.push(goal);
    } else if (status === 'failed') stats.failedGoals++;
    
    stats.totalMoneySaved += goal.currentAmount;
  });

  // Success rate
  if (stats.totalGoals > 0) {
    stats.successRate = (stats.completedGoals / stats.totalGoals) * 100;
  }

  // Compute completion dates and durations when data is available
  completedGoals.forEach(goal => {
    const completionDate =
      (goal.updatedAt && !isNaN(new Date(goal.updatedAt).getTime()))
        ? new Date(goal.updatedAt)
        : (goal.targetDate ? parseTargetDate(goal.targetDate) : null);

    if (completionDate) {
      completionDates.push(completionDate);
    }

    if (goal.createdAt && completionDate) {
      const created = new Date(goal.createdAt);
      const completed = completionDate;
      const diffMs = completed.getTime() - created.getTime();
      if (!isNaN(diffMs) && diffMs >= 0) {
        const days = diffMs / (1000 * 60 * 60 * 24);
        completionDurations.push(days);
      }
    } else if (completionDate) {
      // If we have a completion date but no created date, treat as same-day completion (0 days)
      completionDurations.push(0);
    }
  });

  // Completions in the last 30 days
  if (completionDates.length > 0) {
    const now = new Date();
    const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    stats.completionsLast30d = completionDates.filter(d => d >= cutoff && d <= now).length;
  }

  // Average time to complete (in days)
  if (completionDurations.length > 0) {
    const total = completionDurations.reduce((sum, d) => sum + d, 0);
    stats.averageTimeToComplete = Math.round((total / completionDurations.length) * 10) / 10;
  }

  return stats;
}

/**
 * Generate an encouraging message based on goal progress
 */
export function getEncouragingMessage(goal: Goal): string {
  if (goal.progress >= 100) {
    return "Congratulations! You've achieved your goal!";
  }
  if (goal.progress >= 90) {
    return "Just a few more steps. Your goal is within reach!";
  }
  if (goal.progress >= 75) {
    return "You're almost there! Keep pushing forward!";
  }
  if (goal.progress >= 50) {
    return "Keep going! You're making great progress!";
  }
  if (goal.progress >= 25) {
    return "You're on the right track! Every step counts!";
  }
  return "Every journey begins with a single step. You've got this!";
}








