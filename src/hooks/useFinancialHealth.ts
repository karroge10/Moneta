'use client';

import { useQuery } from '@tanstack/react-query';
import type { FinancialHealthDetails } from '@/types/dashboard';
import { apiFetch } from '@/lib/api-client';
import { API, queryKeys } from '@/lib/query-keys';
import { useAuthReadyForApi } from '@/hooks/useAuthReadyForApi';
import { normalizeHealth } from '@/hooks/useDashboardData';

/** All-time financial health score with its four pillars. */
export function useFinancialHealth() {
  const authReady = useAuthReadyForApi();

  return useQuery({
    queryKey: queryKeys.financialHealth.detail(),
    queryFn: () => apiFetch<Partial<FinancialHealthDetails>>(API.financialHealth),
    select: (data) => normalizeHealth(data ?? {}),
    enabled: authReady,
  });
}
