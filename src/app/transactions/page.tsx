'use client';

import { useState } from 'react';
import Link from 'next/link';
import DashboardHeader from '@/components/DashboardHeader';
import MobileNavbar from '@/components/MobileNavbar';
import TransactionList from '@/components/transactions/TransactionList';
import CategoryGrid from '@/components/transactions/CategoryGrid';
import TransactionModal from '@/components/transactions/TransactionModal';
import { mockTransactions, mockCategories } from '@/lib/mockData';
import { Transaction } from '@/types/dashboard';
import { TimePeriod } from '@/types/dashboard';

export default function TransactionsPage() {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('This Year');
  const [transactions, setTransactions] = useState(mockTransactions);
  const [categories] = useState(mockCategories);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('edit');
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const createDraftTransaction = () => ({
    id: crypto.randomUUID(),
    name: '',
    date: '',
    amount: 0,
    category: null,
    icon: 'HelpCircle',
  });

  const handleTransactionClick = (transaction: Transaction) => {
    setModalMode('edit');
    setSelectedTransaction(transaction);
  };

  const handleAddTransactionClick = () => {
    setModalMode('add');
    setSelectedTransaction(createDraftTransaction());
  };

  const handleSave = (updatedTransaction: Transaction) => {
    setTransactions(prev => {
      const exists = prev.some(t => t.id === updatedTransaction.id);
      if (exists) {
        return prev.map(t => (t.id === updatedTransaction.id ? updatedTransaction : t));
      }
      return [updatedTransaction, ...prev];
    });
    setSelectedTransaction(null);
  };

  const handleCloseModal = () => {
    setSelectedTransaction(null);
  };

  const uniqueCategoryNames = Array.from(new Set(transactions.map(t => t.category).filter(Boolean) as string[]));
  const availableCategories = categories.filter(cat => uniqueCategoryNames.includes(cat.name));

  return (
    <main className="min-h-screen bg-[#202020]">
      {/* Desktop Header */}
      <div className="hidden md:block">
        <DashboardHeader 
          pageName="Transactions"
          timePeriod={timePeriod} 
          onTimePeriodChange={setTimePeriod}
          actionButton={{
            label: 'Add Transaction',
            onClick: handleAddTransactionClick,
          }}
        />
      </div>

      {/* Mobile Navbar */}
      <div className="md:hidden">
        <MobileNavbar 
          pageName="Transactions" 
          timePeriod={timePeriod} 
          onTimePeriodChange={setTimePeriod}
          activeSection="transactions"
        />
      </div>

      {/* Content */}
      <div className="flex flex-col md:grid md:grid-cols-2 gap-4 px-4 md:px-6 pb-6">
        <div className="md:col-span-2 flex justify-end">
          <Link
            href="/transactions/import"
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors cursor-pointer hover:opacity-90"
            style={{ backgroundColor: '#E7E4E4', color: '#282828' }}
          >
            Bulk Import from PDF
          </Link>
        </div>
        <div className="min-h-0">
          <TransactionList
            transactions={transactions}
            categories={availableCategories}
            onTransactionClick={handleTransactionClick}
            onAddTransaction={handleAddTransactionClick}
          />
        </div>
        
        <div className="min-h-0">
          <CategoryGrid
            categories={categories}
            searchQuery={categorySearchQuery}
            onSearchChange={setCategorySearchQuery}
            selectedCategory={categoryFilter}
            onCategoryFilterChange={setCategoryFilter}
            availableCategories={availableCategories}
          />
        </div>
      </div>

      {/* Modal */}
      {selectedTransaction && (
        <TransactionModal
          transaction={selectedTransaction}
          mode={modalMode}
          onClose={handleCloseModal}
          onSave={handleSave}
        />
      )}
    </main>
  );
}
