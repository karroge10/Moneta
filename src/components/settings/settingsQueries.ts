'use client';

import { useMutation, useQuery, useQueryClient, type QueryClient, type QueryKey } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import { API, queryKeys } from '@/lib/query-keys';
import { useAuthReadyForApi } from '@/hooks/useAuthReadyForApi';
import { useCurrency } from '@/hooks/useCurrency';
import type { LoginHistoryEntry } from '@/types/dashboard';

/** Body accepted by PATCH /api/user/settings. */
export interface SettingsPatch {
  country?: string;
  profession?: string | null;
  dateOfBirth?: string | null;
  currencyId?: number;
  incomeTaxRate?: number | null;
  dataSharingEnabled?: boolean;
}

export interface BillingState {
  plan: 'free' | 'premium';
  status: string | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  paymentFailed: boolean;
  nextPaymentAttemptAt: string | null;
  pdfImportsUsed: number;
  pdfImportsLimit: number | null;
  configured: boolean;
}

/**
 * Saves a settings change, then refreshes the settings snapshot (CurrencyContext) and every query whose
 * numbers depend on the changed field. A currency change touches every amount in the app.
 */
export function useUpdateSettings() {
  const queryClient = useQueryClient();
  const { refetch: refetchCurrency } = useCurrency();

  return useMutation({
    mutationFn: (patch: SettingsPatch) => apiFetch(API.userSettings, { method: 'PATCH', body: { ...patch } }),
    onSuccess: async (_data, patch) => {
      await refetchCurrency();
      await invalidateAffectedQueries(queryClient, patch);
    },
  });
}

export function useLoginHistory() {
  const authReady = useAuthReadyForApi();
  return useQuery({
    queryKey: queryKeys.loginHistory.list(),
    queryFn: () => apiFetch<{ history?: LoginHistoryEntry[] }>(API.loginHistory),
    select: (data) => data.history ?? [],
    enabled: authReady,
  });
}

/**
 * Billing state. With `awaitingPremium`, polls every 2s (up to CONFIRM_POLL_ATTEMPTS) until the Stripe
 * webhook has switched the plan to premium, since Checkout's redirect arrives before the webhook.
 */
export function useBilling(awaitingPremium = false) {
  const authReady = useAuthReadyForApi();
  return useQuery({
    queryKey: queryKeys.billing.all,
    queryFn: () => apiFetch<BillingState>(API.billing, { cache: 'no-store' }),
    enabled: authReady,
    refetchInterval: (query) => {
      if (!awaitingPremium || query.state.data?.plan === 'premium') return false;
      return query.state.dataUpdateCount < CONFIRM_POLL_ATTEMPTS ? CONFIRM_POLL_INTERVAL_MS : false;
    },
  });
}

export const CONFIRM_POLL_ATTEMPTS = 15;
const CONFIRM_POLL_INTERVAL_MS = 2000;

export function useDeleteAccount() {
  return useMutation({
    mutationFn: () => apiFetch('/api/user/account', { method: 'DELETE' }),
  });
}

/** Keys whose data depends on the patched fields. */
function affectedKeys(patch: SettingsPatch): QueryKey[] {
  const keys: QueryKey[] = [queryKeys.userSettings.all];
  if (patch.currencyId !== undefined) {
    keys.push(
      queryKeys.dashboard.all,
      queryKeys.transactions.all,
      queryKeys.expenses.all,
      queryKeys.income.all,
      queryKeys.statistics.all,
      queryKeys.financialHealth.all,
      queryKeys.investments.all,
      queryKeys.goals.all,
      queryKeys.recurring.all,
    );
  }
  if (patch.incomeTaxRate !== undefined) keys.push(queryKeys.income.all, queryKeys.dashboard.all);
  // Demographic comparisons use age, country, profession and the sharing switch.
  const changesCohort =
    patch.country !== undefined ||
    patch.profession !== undefined ||
    patch.dateOfBirth !== undefined ||
    patch.dataSharingEnabled !== undefined;
  if (changesCohort) keys.push(queryKeys.statistics.all);
  return keys;
}

function invalidateAffectedQueries(queryClient: QueryClient, patch: SettingsPatch): Promise<unknown> {
  const keys = affectedKeys(patch);
  const invalidations = keys.map((queryKey) => queryClient.invalidateQueries({ queryKey }));
  return Promise.all(invalidations);
}
