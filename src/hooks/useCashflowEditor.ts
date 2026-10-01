'use client';

import { useState } from 'react';
import type { Bill, Category, RecurringItem, Transaction } from '@/types/dashboard';
import { buildTransactionFromRecurring } from '@/lib/recurring-utils';
import { formatDate } from '@/lib/format';
import { useCashflowMutations, type TransactionKind } from '@/hooks/useCashflowMutations';
import { useToast } from '@/contexts/ToastContext';

interface CashflowEditorOptions {
  kind: TransactionKind;
  /** -0.01 for a new expense, 0.01 for a new income; the sign tells the modal the type. */
  draftAmount: number;
  recurringItems: RecurringItem[];
  categories: Category[];
}

/**
 * State and handlers for the transaction modal on the expenses and income pages: add, edit a row,
 * edit an upcoming recurring item, save, delete, pause and resume. Errors go to a toast and keep the
 * modal open so nothing typed is lost.
 */
export function useCashflowEditor({ kind, draftAmount, recurringItems, categories }: CashflowEditorOptions) {
  const { save, remove, setActive } = useCashflowMutations();
  const { addToast } = useToast();
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [mode, setMode] = useState<'add' | 'edit'>('add');

  const openNew = () => {
    setMode('add');
    setSelected(createDraft(draftAmount));
  };

  const openExisting = (transaction: Transaction) => {
    setMode('edit');
    setSelected(transaction);
  };

  const openUpcoming = (bill: Bill) => {
    const item = recurringItems.find((i) => i.id === Number(bill.id));
    if (!item) return;
    const transaction = buildTransactionFromRecurring(item, categories);
    openExisting(transaction);
  };

  const close = () => setSelected(null);

  const handleSave = (transaction: Transaction) => {
    save.mutate(
      { transaction, mode, kind },
      {
        onSuccess: close,
        onError: (error) => addToast(error.message || 'Failed to save transaction', 'error'),
      },
    );
  };

  const handleDelete = () => {
    if (!selected) return;
    remove.mutate(selected, {
      onSuccess: close,
      onError: (error) => addToast(error.message || 'Failed to delete transaction', 'error'),
    });
  };

  const handlePauseResume = (recurringId: number, isActive: boolean) => {
    const item = recurringItems.find((i) => i.id === recurringId);
    if (!item) return;
    setActive.mutate(
      { item, isActive },
      {
        onSuccess: () =>
          setSelected((prev) =>
            prev?.recurringId === recurringId && prev.recurring ? { ...prev, recurring: { ...prev.recurring, isActive } } : prev,
          ),
        onError: (error) => addToast(error.message || 'Failed to update', 'error'),
      },
    );
  };

  return {
    selected,
    mode,
    openNew,
    openExisting,
    openUpcoming,
    close,
    handleSave,
    handleDelete,
    handlePauseResume,
    isSaving: save.isPending || setActive.isPending,
    isDeleting: remove.isPending,
  };
}

function createDraft(amount: number): Transaction {
  return {
    id: crypto.randomUUID(),
    name: '',
    date: formatDate(new Date(), 'medium'),
    amount,
    category: null,
    icon: 'HelpCircle',
  };
}
