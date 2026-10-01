'use client';

import { useQuery } from '@tanstack/react-query';
import type {
  DemographicComparison,
  ExpenseCategory,
  FinancialHealthDetails,
  MonthlySummaryRow,
  StatisticsSummaryItem,
} from '@/types/dashboard';
import type { DemographicDimension } from '@/lib/statistics/cohort';
import { apiFetch } from '@/lib/api-client';
import { API, queryKeys } from '@/lib/query-keys';
import { useAuthReadyForApi } from '@/hooks/useAuthReadyForApi';
import { normalizeHealth } from '@/hooks/useDashboardData';

/** The statistics page always looks at the full history. */
const STATISTICS_TIME_PERIOD = 'All Time';
/** Dimension the full request computes; other dimensions use the lighter demographicOnly request. */
const DEFAULT_DIMENSION: DemographicDimension = 'age';

export interface DemographicSection {
  comparisons: DemographicComparison[];
  cohortSize: number;
  disabled: boolean;
  cohortValueMissing: boolean;
  /** True when the peers are the generated demo cohort, not real users. */
  synthetic: boolean;
}

export interface StatisticsData {
  monthlySummary: MonthlySummaryRow[];
  averageExpenses: ExpenseCategory[];
  summaryItems: StatisticsSummaryItem[];
  financialHealth: FinancialHealthDetails | null;
  demographic: DemographicSection;
  /** Transactions left out of the totals because no exchange rate was found. */
  missingRates: number;
}

/** Personal statistics plus the demographic section for the chosen dimension. */
export function useStatisticsData(dimension: DemographicDimension) {
  const authReady = useAuthReadyForApi();
  const isDefaultDimension = dimension === DEFAULT_DIMENSION;

  const summary = useQuery({
    queryKey: queryKeys.statistics.summary({ timePeriod: STATISTICS_TIME_PERIOD }),
    queryFn: () => fetchStatistics({ demographicDimension: DEFAULT_DIMENSION }),
    select: normalizeStatistics,
    enabled: authReady,
  });

  const demographicOnly = useQuery({
    queryKey: queryKeys.statistics.summary({ timePeriod: STATISTICS_TIME_PERIOD, demographicDimension: dimension, demographicOnly: true }),
    queryFn: () => fetchStatistics({ demographicDimension: dimension, demographicOnly: '1' }),
    select: normalizeDemographic,
    enabled: authReady && !isDefaultDimension,
  });

  const demographic = isDefaultDimension
    ? { data: summary.data?.demographic, isPending: summary.isPending, error: summary.error, refetch: summary.refetch }
    : { data: demographicOnly.data, isPending: demographicOnly.isPending || summary.isPending, error: demographicOnly.error, refetch: demographicOnly.refetch };

  return { summary, demographic };
}

interface RawStatisticsResponse {
  monthlySummary?: MonthlySummaryRow[];
  averageExpenses?: ExpenseCategory[];
  summary?: { items?: StatisticsSummaryItem[] };
  financialHealth?: Partial<FinancialHealthDetails> | null;
  demographicComparisons?: DemographicComparison[];
  demographicCohortSize?: number;
  demographicComparisonsDisabled?: boolean;
  demographicCohortValueMissing?: boolean;
  syntheticDemographicCohort?: boolean;
  missingRates?: number;
}

function fetchStatistics(params: Record<string, string>): Promise<RawStatisticsResponse> {
  return apiFetch<RawStatisticsResponse>(API.statistics, {
    params: { timePeriod: STATISTICS_TIME_PERIOD, ...params },
  });
}

function normalizeStatistics(data: RawStatisticsResponse): StatisticsData {
  return {
    monthlySummary: data.monthlySummary ?? [],
    averageExpenses: data.averageExpenses ?? [],
    summaryItems: data.summary?.items ?? [],
    financialHealth: normalizeHealth(data.financialHealth),
    demographic: normalizeDemographic(data),
    missingRates: data.missingRates ?? 0,
  };
}

function normalizeDemographic(data: RawStatisticsResponse): DemographicSection {
  return {
    comparisons: data.demographicComparisons ?? [],
    cohortSize: typeof data.demographicCohortSize === 'number' ? data.demographicCohortSize : 0,
    disabled: data.demographicComparisonsDisabled === true,
    cohortValueMissing: data.demographicCohortValueMissing === true,
    synthetic: data.syntheticDemographicCohort === true,
  };
}
