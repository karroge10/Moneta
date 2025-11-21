import { Goal } from '@/types/dashboard';

export type GoalStatus = 'active' | 'completed' | 'failed';

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
  longestStreak: number; // in days (placeholder)
  averageTimeToComplete: number; // in days (placeholder)
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
    longestStreak: 0, // Placeholder - requires date tracking
    averageTimeToComplete: 0, // Placeholder - requires date tracking
    totalMoneySaved: 0,
  };

  goals.forEach(goal => {
    const status = getGoalStatus(goal);
    if (status === 'active') stats.activeGoals++;
    else if (status === 'completed') stats.completedGoals++;
    else if (status === 'failed') stats.failedGoals++;
    
    stats.totalMoneySaved += goal.currentAmount;
  });

  // Calculate success rate
  if (stats.totalGoals > 0) {
    stats.successRate = (stats.completedGoals / stats.totalGoals) * 100;
  }

  // Placeholder values for streak and average time
  // These would require createdDate and completedDate fields in Goal interface
  stats.longestStreak = 7; // Placeholder
  stats.averageTimeToComplete = 39; // Placeholder

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








