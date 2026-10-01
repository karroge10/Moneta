'use client';

import { useMutation, useQueryClient, type QueryClient, type QueryKey } from '@tanstack/react-query';
import type { RecurringItem, Transaction } from '@/types/dashboard';
import { apiFetch } from '@/lib/api-client';
import { API, queryKeys } from '@/lib/query-keys';

interface SaveTransactionResponse {
  /** null when a recurring transaction was created with a future start date. */
  transaction: Transaction | null;
  message?: string;
}

/** Create (POST) or update (PUT) a regular transaction. */
export function useSaveTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ transaction, isNew }: { transaction: Transaction; isNew: boolean }) =>
      apiFetch<SaveTransactionResponse>(API.transactions, {
        method: isNew ? 'POST' : 'PUT',
        body: { ...transaction },
      }),
    onSuccess: () => invalidateMoneyData(queryClient, true),
  });
}

/** Delete a regular transaction by id. */
export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<{ success: true }>(API.transactions, { method: 'DELETE', params: { id } }),
    onSuccess: () => invalidateMoneyData(queryClient, false),
  });
}

/** Update a recurring item from the transaction form. */
export function useSaveRecurring() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (transaction: Transaction) => {
      const body = recurringBodyFromTransaction(transaction);
      return apiFetch<{ success: true }>(API.recurring, { method: 'PUT', body });
    },
    onSuccess: () => invalidateMoneyData(queryClient, true),
  });
}

/** Pause or resume a recurring item, keeping every other field as is. */
export function useToggleRecurring() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ item, isActive }: { item: RecurringItem; isActive: boolean }) => {
      const body = recurringBodyFromItem(item, isActive);
      return apiFetch<{ success: true }>(API.recurring, { method: 'PUT', body });
    },
    onSuccess: () => invalidateMoneyData(queryClient, true),
  });
}

/** Delete a recurring item by id. */
export function useDeleteRecurring() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (recurringId: number) =>
      apiFetch<{ success: true }>(API.recurring, { method: 'DELETE', params: { id: recurringId } }),
    onSuccess: () => invalidateMoneyData(queryClient, true),
  });
}

/** Everything that shows totals derived from transactions. */
export function invalidateMoneyData(queryClient: QueryClient, includeRecurring: boolean) {
  const keys: QueryKey[] = [
    queryKeys.transactions.all,
    queryKeys.dashboard.all,
    queryKeys.expenses.all,
    queryKeys.income.all,
    queryKeys.statistics.all,
    queryKeys.financialHealth.all,
  ];
  if (includeRecurring) keys.push(queryKeys.recurring.all);
  return Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
}

function recurringBodyFromTransaction(transaction: Transaction): Record<string, unknown> {
  const recurring = transaction.recurring;
  if (!recurring) throw new Error('Missing recurring data');
  return {
    id: transaction.recurringId,
    name: transaction.name,
    amount: Math.abs(transaction.amount),
    type: transaction.amount < 0 ? 'expense' : 'income',
    startDate: recurring.startDate,
    endDate: recurring.endDate ?? null,
    frequencyUnit: recurring.frequencyUnit,
    frequencyInterval: recurring.frequencyInterval,
    isActive: recurring.isActive ?? true,
    currencyId: transaction.currencyId,
    category: transaction.category,
  };
}

function recurringBodyFromItem(item: RecurringItem, isActive: boolean): Record<string, unknown> {
  return {
    id: item.id,
    name: item.name,
    amount: item.amount,
    type: item.type,
    category: item.category ?? null,
    startDate: item.startDate,
    endDate: item.endDate ?? null,
    frequencyUnit: item.frequencyUnit,
    frequencyInterval: item.frequencyInterval,
    isActive,
  };
}
