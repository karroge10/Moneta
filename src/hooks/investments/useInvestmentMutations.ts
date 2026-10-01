'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import { API, queryKeys } from '@/lib/query-keys';
import type {
  AssetUpdatePayload,
  InvestmentCreatePayload,
  InvestmentTransactionEditState,
} from '@/types/investments';

/** POST a buy or sell; refreshes holdings, totals and transaction lists. */
export function useCreateInvestment() {
  const invalidate = useInvalidateInvestments();
  return useMutation({
    mutationFn: (payload: InvestmentCreatePayload) => apiFetch(API.investments, { method: 'POST', body: { ...payload } }),
    onSuccess: invalidate,
  });
}

/** PUT an edited investment transaction. */
export function useUpdateInvestmentTransaction() {
  const invalidate = useInvalidateInvestments();
  return useMutation({
    mutationFn: (transaction: InvestmentTransactionEditState) =>
      apiFetch(API.transactions, { method: 'PUT', body: { ...transaction } }),
    onSuccess: invalidate,
  });
}

/** DELETE one investment transaction by id. */
export function useDeleteInvestmentTransaction() {
  const invalidate = useInvalidateInvestments();
  return useMutation({
    mutationFn: (transactionId: string) => apiFetch(API.transactions, { method: 'DELETE', params: { id: transactionId } }),
    onSuccess: invalidate,
  });
}

/** PUT a rename or manual price on a user-owned asset. */
export function useUpdateAsset(assetId: string) {
  const invalidate = useInvalidateInvestments();
  return useMutation({
    mutationFn: (updates: AssetUpdatePayload) => apiFetch(API.investment(assetId), { method: 'PUT', body: updates }),
    onSuccess: invalidate,
  });
}

/** DELETE an asset and all its transactions. Drops the detail query first so it is not refetched into a 404. */
export function useDeleteAsset(assetId: string) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateInvestments();
  return useMutation({
    mutationFn: () => apiFetch(API.investment(assetId), { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: queryKeys.investments.detail(assetId) });
      return invalidate();
    },
  });
}

/** Investments, dashboard totals and transaction lists all move when a holding changes. */
function useInvalidateInvestments() {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.investments.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all }),
    ]);
  };
}
