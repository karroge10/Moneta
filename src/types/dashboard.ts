export interface Transaction {
  id: string;
  name: string; // Cleaned/display name
  fullName?: string; // Full original description (for transaction modal)
  originalDescription?: string; // Original description from database (before translation)
  date: string;
  dateRaw?: string; // ISO date string (YYYY-MM-DD) for filtering
  amount: number; // Converted amount in user's preferred currency
  category: string | null;
  icon: string;
  originalAmount?: number; // Amount in statement currency (signed)
  originalCurrencySymbol?: string;
  originalCurrencyAlias?: string;
  currencyId?: number; // Currency ID for editing
  recurring?: RecurringSettings;
  /** Set when this "transaction" is actually a recurring item (future view); used for Pause and PUT recurring */
  recurringId?: number;
  /** When true = active, when false = paused; used in upcoming list to show Paused badge */
  isActive?: boolean;
}

export interface Bill {
  id: string;
  name: string;
  date: string;
  amount: number;
  category: string;
  icon: string;
  /** When true = active, when false = paused; used in upcoming list to show Paused badge */
  isActive?: boolean;
}

export type RecurringFrequencyUnit = 'day' | 'week' | 'month' | 'year';

export interface RecurringSettings {
  isRecurring: boolean;
  frequencyUnit: RecurringFrequencyUnit;
  frequencyInterval: number;
  startDate: string; // ISO date string
  endDate?: string | null;
  type?: 'income' | 'expense';
  /** Paused state for recurring items (future view); when false = active, when true = paused */
  isActive?: boolean;
}

/** Recurring item from GET /api/recurring (full list, not upcoming-only) */
export interface RecurringItem {
  id: number;
  name: string;
  type: 'income' | 'expense';
  amount: number;
  convertedAmount?: number;
  currencyId: number;
  category: string | null;
  startDate: string;
  nextDueDate: string;
  endDate: string | null;
  isActive: boolean;
  frequencyUnit: RecurringFrequencyUnit;
  frequencyInterval: number;
  lastGeneratedAt: string | null;
}

/** Row shape for future (recurring) table; compatible with table columns + Status */
export interface RecurringRow {
  id: string;
  name: string;
  date: string;
  dateRaw: string;
  amount: number;
  category: string | null;
  icon: string;
  isRecurring: true;
  recurringId: number;
  isActive: boolean;
}

export interface Goal {
  id: string;
  name: string;
  targetDate: string;
  targetAmount: number;
  currentAmount: number;
  progress: number;
  currencyId?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Investment {
  id: string;
  name: string;
  subtitle: string;
  ticker?: string | null;
  assetType?: 'crypto' | 'stock' | 'property' | 'custom';
  sourceType?: 'live' | 'manual';
  quantity?: number;
  purchasePrice?: number | null;
  purchaseDate?: string | null;
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

export type TimePeriod = 
  | 'This Month' 
  | 'Last Month' 
  | 'This Year' 
  | 'Last Year' 
  | 'All Time';

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
  type?: string | null; // 'income' | 'expense' | null (for both/all types)
}

export interface InvestmentActivity {
  id: string;
  assetName: string;
  date: string;
  change: string; // e.g., "+0.021 BTC", "-1 NVDA"
  changeType: 'positive' | 'negative';
  icon: string;
}

export interface FinancialMilestone {
  date: string;
  message: string;
  completedGoals: number;
}

export interface DemographicComparison {
  id: string;
  label: string;
  comparison: string; // e.g., "9% higher than others"
  icon: string;
  iconColor: string;
}

export interface MonthlySummaryRow {
  month: string; // Format: "Jan 2025"
  income: number;
  expenses: number;
  savings: number;
  topCategory: {
    name: string;
    percentage: number;
  };
}

export interface StatisticsSummaryItem {
  id: string;
  label: string;
  value: string | number;
  change: string; // e.g., "+35% from beginning"
  icon: string;
  iconColor: string;
  isLarge?: boolean; // For Financial Health Score card
  link?: string; // Optional link text
}

export interface TransactionUploadMetadata {
  currency: string;
  currencyConfidence?: number;
  currencyDetectionMethod?: string | null;
  source: string | null;
  periodStart: string | null;
  periodEnd: string | null;
}

export interface UploadedTransaction {
  date: string;
  description: string;
  translatedDescription: string;
  amount: number;
  category: string | null;
  confidence: number;
}

export interface TransactionUploadResponse {
  transactions: UploadedTransaction[];
  metadata?: TransactionUploadMetadata;
}

export interface UserSettings {
  name: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  jobPosition: string;
  age: number;
  country: string;
  language: string;
  currency: string;
  dateOfBirth: string;
  profession: string;
  defaultPage: string;
  plan: string;
  /** null = disabled, number = enabled (percentage 0-100) */
  incomeTaxRate: number | null;
}

export interface LoginHistoryEntry {
  date: string;
  time: string;
  device: string;
  location: string;
}

export interface Achievement {
  id: string;
  name: string;
  unlocked: boolean;
  icon: string;
}

export interface NotificationEntry {
  id: string;
  date: string;
  time: string;
  type: string;
  text: string;
}

export interface NotificationSettings {
  pushNotifications: boolean;
  upcomingBills: boolean;
  upcomingIncome: boolean;
  investments: boolean;
  goals: boolean;
  promotionalEmail: boolean;
  aiInsights: boolean;
}

