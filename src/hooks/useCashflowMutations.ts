'use client';

import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import type { RecurringItem, Transaction } from '@/types/dashboard';
import { apiFetch } from '@/lib/api-client';
import { API, queryKeys } from '@/lib/query-keys';

export type TransactionKind = 'expense' | 'income';

export interface SaveTransactionInput {
  transaction: Transaction;
  mode: 'add' | 'edit';
  /** Type sent for recurring items; one-off transactions carry their type in the amount sign. */
  kind: TransactionKind;
}

/**
 * Save, delete and pause/resume for transactions and recurring items opened from the dashboard,
 * expenses and income pages. Every success refreshes the lists and totals those pages show.
 */
export function useCashflowMutations() {
  const queryClient = useQueryClient();
  const onSuccess = () => invalidateCashflow(queryClient);

  const save = useMutation({ mutationFn: saveTransaction, onSuccess });
  const remove = useMutation({ mutationFn: deleteTransaction, onSuccess });
  const setActive = useMutation({ mutationFn: setRecurringActive, onSuccess });

  return { save, remove, setActive };
}

/** Everything that shows transaction or recurring data. */
function invalidateCashflow(queryClient: QueryClient): Promise<unknown> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.recurring.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.income.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.statistics.all }),
  ]);
}

async function saveTransaction({ transaction, mode, kind }: SaveTransactionInput): Promise<void> {
  if (transaction.recurringId !== undefined) {
    const body = recurringUpdateBody(transaction, kind);
    await apiFetch(API.recurring, { method: 'PUT', body });
    return;
  }

  const isNew = mode === 'add';
  if (isNew && transaction.recurring?.isRecurring) {
    const body = recurringCreateBody(transaction, kind);
    await apiFetch(API.recurring, { method: 'POST', body });
    return;
  }

  const body = { ...transaction };
  await apiFetch(API.transactions, { method: isNew ? 'POST' : 'PUT', body });
}

async function deleteTransaction(transaction: Transaction): Promise<void> {
  if (transaction.recurringId !== undefined) {
    await apiFetch(API.recurring, { method: 'DELETE', params: { id: transaction.recurringId } });
    return;
  }
  await apiFetch(API.transactions, { method: 'DELETE', params: { id: transaction.id } });
}

async function setRecurringActive({ item, isActive }: { item: RecurringItem; isActive: boolean }): Promise<void> {
  const body = {
    id: item.id,
    name: item.name,
    amount: item.amount,
    type: item.type,
    category: item.category ?? null,
    currencyId: item.currencyId,
    startDate: item.startDate,
    endDate: item.endDate ?? null,
    frequencyUnit: item.frequencyUnit,
    frequencyInterval: item.frequencyInterval,
    isActive,
  };
  await apiFetch(API.recurring, { method: 'PUT', body });
}

function recurringUpdateBody(transaction: Transaction, kind: TransactionKind): Record<string, unknown> {
  const rec = transaction.recurring;
  if (!rec) throw new Error('Missing recurring data');
  return {
    id: transaction.recurringId,
    name: transaction.name,
    amount: Math.abs(transaction.amount),
    type: rec.type ?? kind,
    startDate: rec.startDate,
    endDate: rec.endDate ?? null,
    frequencyUnit: rec.frequencyUnit,
    frequencyInterval: rec.frequencyInterval,
    isActive: rec.isActive ?? true,
    currencyId: transaction.currencyId,
    category: transaction.category,
  };
}

function recurringCreateBody(transaction: Transaction, kind: TransactionKind): Record<string, unknown> {
  const rec = transaction.recurring;
  const today = new Date().toISOString().split('T')[0];
  return {
    name: transaction.name,
    amount: Math.abs(transaction.amount),
    category: transaction.category,
    currencyId: transaction.currencyId,
    type: kind,
    startDate: rec?.startDate || today,
    endDate: rec?.endDate ?? null,
    frequencyUnit: rec?.frequencyUnit ?? 'month',
    frequencyInterval: rec?.frequencyInterval ?? 1,
    createInitial: true,
  };
}
