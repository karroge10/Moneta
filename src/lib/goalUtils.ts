import { Goal } from '@/types/dashboard';

export type GoalStatus = 'active' | 'completed' | 'failed';


export function calculateGoalProgress(currentAmount: number, targetAmount: number): number {
  if (targetAmount === 0) return 0;
  return Math.min(100, Math.round((currentAmount / targetAmount) * 100 * 10) / 10);
}


function parseTargetDate(dateStr: string): Date {
  
  const cleaned = dateStr.replace(/(\d+)(st|nd|rd|th)/, '$1');
  return new Date(cleaned);
}


function isDatePassed(targetDate: string): boolean {
  try {
    const target = parseTargetDate(targetDate);
    const now = new Date();
    
    target.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    return target < now;
  } catch {
    
    return false;
  }
}


export function getGoalStatus(goal: Goal): GoalStatus {
  if (goal.progress >= 100) {
    return 'completed';
  }
  if (isDatePassed(goal.targetDate) && goal.progress < 100) {
    return 'failed';
  }
  return 'active';
}


export function filterGoals(
  goals: Goal[],
  searchQuery: string,
  statusFilter: GoalStatus | 'all' | null
): Goal[] {
  return goals.filter(goal => {
    
    const matchesSearch = !searchQuery || 
      goal.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      goal.targetDate.toLowerCase().includes(searchQuery.toLowerCase());
    
    
    const matchesStatus = !statusFilter || statusFilter === 'all' || getGoalStatus(goal) === statusFilter;
    
    return matchesSearch && matchesStatus;
  });
}


export interface GoalSummaryStats {
  activeGoals: number;
  completedGoals: number;
  failedGoals: number;
  successRate: number;
  totalGoals: number;
  completionsLast30d: number;
  averageTimeToComplete: number | null; 
  totalMoneySaved: number;
}


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

  
  if (stats.totalGoals > 0) {
    stats.successRate = (stats.completedGoals / stats.totalGoals) * 100;
  }

  
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
      
      completionDurations.push(0);
    }
  });

  
  if (completionDates.length > 0) {
    const now = new Date();
    const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    stats.completionsLast30d = completionDates.filter(d => d >= cutoff && d <= now).length;
  }

  
  if (completionDurations.length > 0) {
    const total = completionDurations.reduce((sum, d) => sum + d, 0);
    stats.averageTimeToComplete = Math.round((total / completionDurations.length) * 10) / 10;
  }

  return stats;
}


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








