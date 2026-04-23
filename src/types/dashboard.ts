export interface Transaction {
  id: string;
  name: string; 
  fullName?: string; 
  originalDescription?: string; 
  date: string;
  dateRaw?: string; 
  amount: number; 
  category: string | null;
  icon: string;
  originalAmount?: number; 
  originalCurrencySymbol?: string;
  originalCurrencyAlias?: string;
  currencyId?: number; 
  recurring?: RecurringSettings;
  
  recurringId?: number;
  
  isActive?: boolean;
  color?: string;
}

export interface Bill {
  id: string;
  name: string;
  date: string;
  amount: number;
  category: string;
  icon: string;
  
  isActive?: boolean;
}

export type RecurringFrequencyUnit = 'day' | 'week' | 'month' | 'year';

export interface RecurringSettings {
  isRecurring: boolean;
  frequencyUnit: RecurringFrequencyUnit;
  frequencyInterval: number;
  startDate: string; 
  endDate?: string | null;
  type?: 'income' | 'expense';
  
  isActive?: boolean;
}


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
  purchaseCurrencyId?: number | null;
  currentValue: number;
  changePercent: number;
  gainLoss?: number;
  currentPrice?: number;
  icon: string;
  priceHistory?: { date: string; price: number }[];
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

export interface FinancialHealthDetails {
  score: number;
  trend: number;
  details: {
    saving: number;
    spendingControl: number;
    goals: number;
    engagement: number;
  };
}

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
  cost?: number;
  pnl?: number;
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
  type?: string | null; 
}

export interface InvestmentActivity {
  id: string;
  assetName: string;
  date: string;
  change: string; 
  changeType: 'positive' | 'negative';
  icon: string;
}

export interface DemographicComparison {
  id: string;
  label: string;
  
  change: string | null;
  icon: string;
  iconColor: string;
  
  invertChangeColor?: boolean;
}

export interface MonthlySummaryRow {
  month: string; 
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
  change: string; 
  icon: string;
  iconColor: string;
  isLarge?: boolean; 
  link?: string; 
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
  email: string;
  jobPosition: string;
  age: number;
  country: string;
  currency: string;
  dateOfBirth: string;
  profession: string;
  incomeTaxRate: number | null;
}

export interface LoginHistoryEntry {
  date: string;
  time: string;
  device: string;
  location: string;
}

export interface NotificationEntry {
  id: string;
  date: string;
  time: string;
  type: string;
  text: string;
  read: boolean;
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

