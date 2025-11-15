'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';
import { Transaction } from '@/types/dashboard';
import { getIcon } from '@/lib/iconMapping';
import { NavArrowRight } from 'iconoir-react';
import { formatNumber } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import Link from 'next/link';
import TransactionModal from '@/components/transactions/TransactionModal';

interface TransactionsCardProps {
  transactions: Transaction[];
}

const MAX_NAME_LENGTH = 25;

function truncateName(name: string, maxLength: number): string {
  if (name.length <= maxLength) return name;
  return name.substring(0, maxLength) + '...';
}

export default function TransactionsCard({ transactions }: TransactionsCardProps) {
  const { currency } = useCurrency();
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const handleTransactionClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
  };

  const handleCloseModal = () => {
    setSelectedTransaction(null);
  };

  const handleSave = async (updatedTransaction: Transaction) => {
    // Transaction saved - modal will close
    // In a real app, you might want to refresh the dashboard data here
    setSelectedTransaction(null);
  };

  const handleDelete = async () => {
    if (!selectedTransaction) return;
    
    try {
      const response = await fetch(`/api/transactions?id=${selectedTransaction.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete transaction');
      }
      
      setSelectedTransaction(null);
      // In a real app, you might want to refresh the dashboard data here
      window.location.reload(); // Simple refresh for now
    } catch (err) {
      console.error('Error deleting transaction:', err);
      setSelectedTransaction(null);
    }
  };

  if (transactions.length === 0) {
    return (
      <Card title="Transactions" href="/transactions">
        <div className="flex flex-col flex-1 mt-2 justify-center items-center py-8">
          <div className="text-body text-center mb-2 opacity-70">Add your first transaction</div>
          <div className="text-helper text-center">Start tracking your spending and income</div>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card title="Transactions" href="/transactions">
        <div className="flex flex-col flex-1 mt-2">
          <div className="space-y-4 flex-1">
            {transactions.slice(0, 6).map((transaction) => {
              const Icon = getIcon(transaction.icon);
              const isExpense = transaction.amount < 0;
              const absoluteAmount = Math.abs(transaction.amount);
              const truncatedName = truncateName(transaction.name, MAX_NAME_LENGTH);
              
              return (
                <div 
                  key={transaction.id} 
                  className="flex items-center gap-3 min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => handleTransactionClick(transaction)}
                >
                  <div className="flex-shrink-0">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: 'rgba(163, 102, 203, 0.1)' }}
                    >
                      <Icon width={24} height={24} strokeWidth={1.5} style={{ color: '#E7E4E4' }} />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="text-body font-medium truncate" title={transaction.name.length > MAX_NAME_LENGTH ? transaction.name : undefined}>
                      {truncatedName}
                    </div>
                    <div className="text-helper">{transaction.date}</div>
                  </div>
                  <div className="text-body font-semibold flex-shrink-0 whitespace-nowrap">
                    {currency.symbol}{formatNumber(absoluteAmount)}
                  </div>
                </div>
              );
            })}
          </div>
          <Link 
            href="/transactions" 
            className="text-helper flex items-center gap-1 mt-4 cursor-pointer group hover-text-purple transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            View All <NavArrowRight width={14} height={14} className="stroke-current transition-colors" />
          </Link>
        </div>
      </Card>

      {/* Transaction Modal */}
      {selectedTransaction && (
        <TransactionModal
          transaction={selectedTransaction}
          mode="edit"
          onClose={handleCloseModal}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </>
  );
}

