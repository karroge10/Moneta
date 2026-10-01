'use client';

import { useState } from 'react';
import LatestTransactionsCard from '@/components/dashboard/LatestTransactionsCard';
import TransactionModal from '@/components/transactions/TransactionModal';
import type { Transaction } from '@/types/dashboard';
import { useCategories } from '@/hooks/useCategories';
import { useCurrencyOptions } from '@/hooks/useCurrencyOptions';
import { useCashflowMutations } from '@/hooks/useCashflowMutations';
import { useToast } from '@/contexts/ToastContext';

interface TransactionsCardProps {
  transactions: Transaction[];
}

/** Dashboard list of the latest transactions; clicking a row opens it for editing. */
export default function TransactionsCard({ transactions }: TransactionsCardProps) {
  const { categories } = useCategories();
  const { currencyOptions, loading: currencyOptionsLoading } = useCurrencyOptions();
  const { save, remove } = useCashflowMutations();
  const { addToast } = useToast();
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const handleSave = (updated: Transaction) => {
    const kind = updated.amount < 0 ? 'expense' : 'income';
    save.mutate(
      { transaction: updated, mode: 'edit', kind },
      {
        onSuccess: () => setSelectedTransaction(null),
        onError: (error) => addToast(error.message || 'Failed to save transaction', 'error'),
      },
    );
  };

  const handleDelete = () => {
    if (!selectedTransaction) return;
    remove.mutate(selectedTransaction, {
      onSuccess: () => setSelectedTransaction(null),
      onError: (error) => addToast(error.message || 'Failed to delete transaction', 'error'),
    });
  };

  const canEdit = categories.length > 0 && currencyOptions.length > 0;

  return (
    <>
      <LatestTransactionsCard
        title="Transactions"
        transactions={transactions}
        emptyTitle="Add your first transaction"
        emptyDescription="Start tracking your spending and income"
        onItemClick={setSelectedTransaction}
      />

      {selectedTransaction && canEdit && (
        <TransactionModal
          transaction={selectedTransaction}
          mode="edit"
          onClose={() => setSelectedTransaction(null)}
          onSave={handleSave}
          onDelete={handleDelete}
          isSaving={save.isPending}
          isDeleting={remove.isPending}
          categories={categories}
          currencyOptions={currencyOptions}
          currencyOptionsLoading={currencyOptionsLoading}
        />
      )}
    </>
  );
}
