'use client';

import { NavArrowRight } from 'iconoir-react';
import { Transaction } from '@/types/dashboard';
import { formatNumber } from '@/lib/utils';

interface TransactionMonthGroupProps {
  month: string;
  transactions: Transaction[];
  children: (transaction: Transaction) => React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  maxRows?: number;
}

export default function TransactionMonthGroup({ 
  month, 
  transactions, 
  children, 
  isExpanded,
  onToggle,
  maxRows = 6
}: TransactionMonthGroupProps) {
  const monthTotal = transactions.reduce((sum, t) => sum + t.amount, 0);
  const displayedTransactions = transactions.slice(0, maxRows);

  return (
    <div className="overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-2 text-body hover-text-purple transition-colors cursor-pointer"
      >
        <span>{month}</span>
        <div className="flex items-center gap-2">
          <span className="text-helper">${formatNumber(monthTotal)}</span>
          <NavArrowRight 
            width={14} 
            height={14} 
            className={`stroke-current transition-transform duration-300 ease-in-out ${isExpanded ? 'rotate-90' : ''}`} 
          />
        </div>
      </button>
      <div 
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="ml-4 mt-2 pb-0">
          <div className="max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
            <div className="space-y-3">
              {displayedTransactions.map((transaction) => (
                <div key={transaction.id}>
                  {children(transaction)}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


