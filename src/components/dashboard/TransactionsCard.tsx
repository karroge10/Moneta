'use client';

import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import { Transaction, Category } from '@/types/dashboard';
import { getIcon } from '@/lib/iconMapping';
import { NavArrowRight } from 'iconoir-react';
import { formatNumber } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import Link from 'next/link';
import TransactionModal from '@/components/transactions/TransactionModal';

interface TransactionsCardProps {
  transactions: Transaction[];
  onRefresh?: () => void;
}

const MAX_NAME_LENGTH = 25;

function truncateName(name: string, maxLength: number): string {
  if (name.length <= maxLength) return name;
  return name.substring(0, maxLength) + '...';
}

export default function TransactionsCard({ transactions, onRefresh }: TransactionsCardProps) {
  const { currency } = useCurrency();
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currencyOptions, setCurrencyOptions] = useState<Array<{ id: number; name: string; symbol: string; alias: string }>>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/categories');
        if (response.ok) {
          const data = await response.json();
          setCategories(data.categories || []);
        }
      } catch (err) {
        console.error('Error fetching categories:', err);
      }
    };
    fetchCategories();
  }, []);

  // Fetch currencies
  useEffect(() => {
    const fetchCurrencies = async () => {
      try {
        const response = await fetch('/api/currencies');
        if (response.ok) {
          const data = await response.json();
          setCurrencyOptions(data.currencies || []);
        }
      } catch (err) {
        console.error('Error fetching currencies:', err);
      }
    };
    fetchCurrencies();
  }, []);

  const handleTransactionClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
  };

  const handleCloseModal = () => {
    setSelectedTransaction(null);
  };

  const handleSave = async (updatedTransaction: Transaction) => {
    if (!selectedTransaction) return;
    
    try {
      setIsSaving(true);
      const response = await fetch('/api/transactions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTransaction),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save transaction');
      }
      
      setSelectedTransaction(null);
      // Refresh dashboard data if callback provided
      if (onRefresh) {
        onRefresh();
      } else {
        window.location.reload();
      }
    } catch (err) {
      console.error('Error saving transaction:', err);
      setSelectedTransaction(null);
    } finally {
      setIsSaving(false);
    }
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
      // Refresh dashboard data if callback provided
      if (onRefresh) {
        onRefresh();
      } else {
        window.location.reload();
      }
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
              const originalAmount = transaction.originalAmount ?? transaction.amount;
              const absoluteOriginalAmount = Math.abs(originalAmount);
              const convertedAbsoluteAmount = Math.abs(transaction.amount);
              const displaySymbol = transaction.originalCurrencySymbol ?? currency.symbol;
              const shouldShowConvertedHelper =
                !!transaction.originalCurrencySymbol &&
                (transaction.originalCurrencySymbol !== currency.symbol ||
                  convertedAbsoluteAmount !== absoluteOriginalAmount);
              const truncatedName = truncateName(transaction.name, MAX_NAME_LENGTH);
              
              return (
                <div 
                  key={transaction.id} 
                  className="flex items-center gap-3 min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => handleTransactionClick(transaction)}
                >
                  <div className="shrink-0">
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
                  <div className="flex flex-col items-end shrink-0 text-right">
                    <div className="text-body font-semibold whitespace-nowrap">
                      {displaySymbol}{formatNumber(absoluteOriginalAmount)}
                    </div>
                    {shouldShowConvertedHelper && (
                      <div className="text-helper text-xs whitespace-nowrap">
                        ≈ {currency.symbol}{formatNumber(convertedAbsoluteAmount)}
                      </div>
                    )}
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
      {selectedTransaction && categories.length > 0 && currencyOptions.length > 0 && (
        <TransactionModal
          transaction={selectedTransaction}
          mode="edit"
          onClose={handleCloseModal}
          onSave={handleSave}
          onDelete={handleDelete}
          isSaving={isSaving}
          categories={categories}
          currencyOptions={currencyOptions}
        />
      )}
    </>
  );
}

