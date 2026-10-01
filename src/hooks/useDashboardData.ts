'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type {
  Transaction,
  ExpenseCategory,
  TimePeriod,
  Goal,
  Investment,
  RecurringItem,
  FinancialHealthDetails,
} from '@/types/dashboard';
import { apiFetch } from '@/lib/api-client';
import { API, queryKeys } from '@/lib/query-keys';
import { useAuthReadyForApi } from '@/hooks/useAuthReadyForApi';
import { emptyRoundupInsight, type RoundupInsightDto } from '@/lib/roundup-insight';
import { getGoalStatus } from '@/lib/goalUtils';

export interface DashboardTotal {
  amount: number;
  trend: number;
  comparisonLabel: string;
}

export interface DashboardData {
  income: DashboardTotal;
  expenses: DashboardTotal;
  transactions: Transaction[];
  topExpenses: ExpenseCategory[];
  investments: Investment[];
  recurringItems: RecurringItem[];
  /** Goals that are not completed yet. */
  goals: Goal[];
  financialHealth: FinancialHealthDetails | null;
  roundupInsight: RoundupInsightDto;
  /** Transactions left out of the totals because no exchange rate was found. */
  missingRates: number;
}

/**
 * Dashboard summary for one period. Keeps the previous period on screen while the next one loads.
 * Goal, transaction and recurring mutations refresh it by invalidating `queryKeys.dashboard.all`.
 */
export function useDashboardData(timePeriod: TimePeriod) {
  const authReady = useAuthReadyForApi();

  return useQuery({
    queryKey: queryKeys.dashboard.summary(timePeriod),
    queryFn: () => apiFetch<RawDashboardResponse>(API.dashboard, { params: { timePeriod } }),
    select: normalizeDashboard,
    enabled: authReady,
    placeholderData: keepPreviousData,
  });
}

type RawTotal = Partial<DashboardTotal> | undefined;

interface RawDashboardResponse {
  income?: RawTotal;
  expenses?: RawTotal;
  transactions?: Transaction[];
  topExpenses?: ExpenseCategory[];
  investments?: Investment[];
  recurringItems?: RecurringItem[];
  goals?: Goal[];
  financialHealth?: Partial<FinancialHealthDetails> | null;
  roundupInsight?: RoundupInsightDto | null;
  missingRates?: number;
}

const EMPTY_HEALTH_DETAILS: FinancialHealthDetails['details'] = { saving: 0, spendingControl: 0, goals: 0, engagement: 0 };

function normalizeDashboard(data: RawDashboardResponse): DashboardData {
  const goals = data.goals ?? [];
  return {
    income: normalizeTotal(data.income),
    expenses: normalizeTotal(data.expenses),
    transactions: data.transactions ?? [],
    topExpenses: data.topExpenses ?? [],
    investments: data.investments ?? [],
    recurringItems: data.recurringItems ?? [],
    goals: goals.filter((goal) => getGoalStatus(goal) !== 'completed'),
    financialHealth: normalizeHealth(data.financialHealth),
    roundupInsight: data.roundupInsight ?? emptyRoundupInsight(),
    missingRates: data.missingRates ?? 0,
  };
}

function normalizeTotal(total: RawTotal): DashboardTotal {
  return {
    amount: total?.amount ?? 0,
    trend: total?.trend ?? 0,
    comparisonLabel: total?.comparisonLabel ?? '',
  };
}

/** Shared by the dashboard and statistics responses, which embed the same health block. */
export function normalizeHealth(health: Partial<FinancialHealthDetails> | null | undefined): FinancialHealthDetails | null {
  if (health == null) return null;
  return {
    score: health.score ?? 0,
    trend: health.trend ?? 0,
    details: health.details ?? EMPTY_HEALTH_DETAILS,
  };
}
