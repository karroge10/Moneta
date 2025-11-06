export interface Transaction {
  id: string;
  name: string;
  date: string;
  amount: number;
  category: string | null;
  icon: string;
}

export interface Bill {
  id: string;
  name: string;
  date: string;
  amount: number;
  category: string;
  icon: string;
}

export interface Goal {
  id: string;
  name: string;
  targetDate: string;
  targetAmount: number;
  currentAmount: number;
  progress: number;
}

export interface Investment {
  id: string;
  name: string;
  subtitle: string;
  currentValue: number;
  changePercent: number;
  icon: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  amount: number;
  percentage: number;
  icon: string;
  color: string;
}

export type TimePeriod = 'This Month' | 'This Quarter' | 'This Year' | 'All Time';

export interface IncomeSource {
  id: string;
  name: string;
  amount: number;
  percentage: number;
  icon: string;
  color: string;
}

export interface PerformanceDataPoint {
  date: string;
  value: number;
}

export interface LatestExpense extends Transaction {
  month?: string;
}

export interface LatestIncome extends Transaction {
  month?: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

