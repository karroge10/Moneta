'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type {
  ExpenseCategory,
  PerformanceDataPoint,
  RecurringItem,
  TimePeriod,
  Transaction,
} from '@/types/dashboard';
import { apiFetch } from '@/lib/api-client';
import { API, queryKeys } from '@/lib/query-keys';
import { useAuthReadyForApi } from '@/hooks/useAuthReadyForApi';
import { emptyRoundupInsight, type RoundupInsightDto } from '@/lib/roundup-insight';

export type CashflowType = 'expense' | 'income';

export interface TrendFigure {
  amount: number;
  trend: number;
  trendSkipped: boolean;
}

/** One shape for /api/expenses and /api/income, which name the same blocks differently. */
export interface CashflowSummary {
  total: TrendFigure;
  /** Monthly average; income responses also carry a subtitle. */
  average: TrendFigure & { subtitle?: string };
  /** Only sent for This Month and Last Month. */
  averageDaily: TrendFigure | null;
  /** Top categories (expenses) or top sources (income). Same row shape. */
  breakdown: ExpenseCategory[];
  latest: Transaction[];
  performance: { trend: number; trendText: string; data: PerformanceDataPoint[] };
  demographicComparisonsDisabled: boolean;
  /** Expenses only. */
  roundupInsight: RoundupInsightDto;
  /** Transactions left out of the totals because no exchange rate was found. */
  missingRates: number;
}

/** Totals, breakdown, latest rows and chart for the expenses or income page. */
export function useCashflowSummary(type: CashflowType, timePeriod: TimePeriod) {
  const authReady = useAuthReadyForApi();
  const keys = type === 'expense' ? queryKeys.expenses : queryKeys.income;
  const url = type === 'expense' ? API.expenses : API.income;

  return useQuery({
    queryKey: keys.summary({ timePeriod }),
    queryFn: () => apiFetch<RawCashflowResponse>(url, { params: { timePeriod } }),
    select: normalizeCashflow,
    enabled: authReady,
    placeholderData: keepPreviousData,
  });
}

/** Recurring items of one type, used for the Upcoming card. */
export function useRecurringItems(type: CashflowType) {
  const authReady = useAuthReadyForApi();

  return useQuery({
    queryKey: queryKeys.recurring.list({ type }),
    queryFn: () => apiFetch<{ items?: RecurringItem[] }>(API.recurring, { params: { type } }),
    select: (data) => data.items ?? [],
    enabled: authReady,
  });
}

type RawFigure = { amount?: number; trend?: number; trendSkipped?: boolean; subtitle?: string } | null | undefined;

interface RawCashflowResponse {
  total?: RawFigure;
  averageMonthly?: RawFigure;
  average?: RawFigure;
  averageDaily?: RawFigure;
  topCategories?: ExpenseCategory[];
  topSources?: ExpenseCategory[];
  latestExpenses?: Transaction[];
  latestIncomes?: Transaction[];
  performance?: { trend?: number; trendText?: string; data?: PerformanceDataPoint[] };
  demographicComparisonsDisabled?: boolean;
  roundupInsight?: RoundupInsightDto | null;
  missingRates?: number;
}

function normalizeCashflow(data: RawCashflowResponse): CashflowSummary {
  const averageSource = data.averageMonthly ?? data.average;
  const average = { ...normalizeFigure(averageSource), subtitle: averageSource?.subtitle };
  return {
    total: normalizeFigure(data.total),
    average,
    averageDaily: data.averageDaily ? normalizeFigure(data.averageDaily) : null,
    breakdown: data.topCategories ?? data.topSources ?? [],
    latest: data.latestExpenses ?? data.latestIncomes ?? [],
    performance: {
      trend: data.performance?.trend ?? 0,
      trendText: data.performance?.trendText ?? '',
      data: data.performance?.data ?? [],
    },
    demographicComparisonsDisabled: data.demographicComparisonsDisabled === true,
    roundupInsight: data.roundupInsight ?? emptyRoundupInsight(),
    missingRates: data.missingRates ?? 0,
  };
}

function normalizeFigure(figure: RawFigure): TrendFigure {
  return {
    amount: figure?.amount ?? 0,
    trend: figure?.trend ?? 0,
    trendSkipped: figure?.trendSkipped === true,
  };
}
