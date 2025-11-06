'use client';

import React from 'react';
import { Transaction, Category } from '@/types/dashboard';
import TransactionMonthGroup from './shared/TransactionMonthGroup';
import TransactionRow from './shared/TransactionRow';
import SearchBar from './shared/SearchBar';
import CategoryFilter from './shared/CategoryFilter';
import { groupTransactionsByMonth, filterTransactions } from '@/lib/transactionUtils';
import Card from '@/components/ui/Card';

interface TransactionListProps {
  transactions: Transaction[];
  categories: Category[];
  onTransactionClick: (transaction: Transaction) => void;
}

export default function TransactionList({ transactions, categories, onTransactionClick }: TransactionListProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState<string | null>(null);
  const [expandedMonth, setExpandedMonth] = React.useState<string | null>(null);
  const hasInitializedRef = React.useRef(false);

  const filteredTransactions = filterTransactions(transactions, searchQuery, categoryFilter);
  const groupedByMonth = groupTransactionsByMonth(filteredTransactions);
  const months = Object.keys(groupedByMonth);

  // Initialize with first month expanded only on initial mount
  React.useEffect(() => {
    if (!hasInitializedRef.current && months.length > 0) {
      setExpandedMonth(months[0]);
      hasInitializedRef.current = true;
    }
  }, [months]);

  // Reset expanded month when filters change (but don't auto-expand)
  React.useEffect(() => {
    if (hasInitializedRef.current && expandedMonth && !months.includes(expandedMonth)) {
      setExpandedMonth(null);
    }
  }, [months, expandedMonth]);

  const handleMonthToggle = (month: string) => {
    if (expandedMonth === month) {
      // Close the currently expanded month
      setExpandedMonth(null);
    } else {
      // Open the clicked month (this automatically closes the previous one)
      setExpandedMonth(month);
    }
  };

  return (
    <Card title="Latest Transactions" className="h-full flex flex-col">
      <div className="flex flex-col gap-4 mt-4 flex-1 min-h-0">
        <div className="flex gap-3 shrink-0">
          <div className="flex-[0.6]">
            <SearchBar value={searchQuery} onChange={setSearchQuery} />
          </div>
          <div className="flex-[0.4]">
            <CategoryFilter 
              categories={categories}
              selectedCategory={categoryFilter}
              onSelect={setCategoryFilter}
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 min-h-0">
          <div>
            {months.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="text-body mb-2 opacity-70">No transactions found</div>
                <div className="text-helper">Try adjusting your search or filters</div>
              </div>
            ) : (
              months.map((month) => (
                <TransactionMonthGroup
                  key={month}
                  month={month}
                  transactions={groupedByMonth[month]}
                  isExpanded={expandedMonth === month}
                  onToggle={() => handleMonthToggle(month)}
                  maxRows={6}
                >
                  {(transaction) => (
                    <TransactionRow
                      transaction={transaction}
                      onClick={() => onTransactionClick(transaction)}
                    />
                  )}
                </TransactionMonthGroup>
              ))
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

