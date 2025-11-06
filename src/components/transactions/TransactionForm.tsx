'use client';

import { useState, useEffect } from 'react';
import { Transaction, Category } from '@/types/dashboard';
import CategoryPickerGrid from './CategoryPickerGrid';
import { mockCategories } from '@/lib/mockData';

interface TransactionFormProps {
  transaction: Transaction;
  onSave: (transaction: Transaction) => void;
  onCancel: () => void;
}

export default function TransactionForm({ transaction, onSave, onCancel }: TransactionFormProps) {
  const [formData, setFormData] = useState<Transaction>(transaction);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    mockCategories.find(c => c.name === transaction.category) || null
  );

  useEffect(() => {
    if (selectedCategory) {
      setFormData(prev => ({
        ...prev,
        category: selectedCategory.name,
        icon: selectedCategory.icon,
      }));
    }
  }, [selectedCategory]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleCategorySelect = (category: Category) => {
    setSelectedCategory(category);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-body font-medium mb-2">Transaction Name</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          className="w-full px-4 py-2 rounded-xl bg-[#202020] text-body border border-[#3a3a3a] focus:border-[#AC66DA] focus:outline-none transition-colors"
          style={{ color: 'var(--text-primary)' }}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-body font-medium mb-2">Amount</label>
          <input
            type="number"
            step="0.01"
            value={formData.amount}
            onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
            className="w-full px-4 py-2 rounded-xl bg-[#202020] text-body border border-[#3a3a3a] focus:border-[#AC66DA] focus:outline-none transition-colors"
            style={{ color: 'var(--text-primary)' }}
          />
        </div>

        <div>
          <label className="block text-body font-medium mb-2">Date</label>
          <input
            type="text"
            value={formData.date}
            onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
            className="w-full px-4 py-2 rounded-xl bg-[#202020] text-body border border-[#3a3a3a] focus:border-[#AC66DA] focus:outline-none transition-colors"
            style={{ color: 'var(--text-primary)' }}
            placeholder="Dec 2nd 2024"
          />
        </div>
      </div>

      <CategoryPickerGrid
        categories={mockCategories}
        selectedCategoryId={selectedCategory?.id || null}
        onSelectCategory={handleCategorySelect}
      />

      <div className="flex gap-4 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-6 py-3 rounded-full text-body font-semibold transition-colors cursor-pointer hover:opacity-80"
          style={{ backgroundColor: '#3a3a3a' }}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 px-6 py-3 rounded-full text-body font-semibold transition-colors cursor-pointer hover:opacity-90"
          style={{ backgroundColor: 'var(--accent-purple)', color: 'var(--text-primary)' }}
        >
          Save
        </button>
      </div>
    </form>
  );
}


