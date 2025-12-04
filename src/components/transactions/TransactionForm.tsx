'use client';

import { useState, useEffect, useRef } from 'react';
import { NavArrowDown, Trash, ShoppingBag, Wallet } from 'iconoir-react';
import { Transaction, Category } from '@/types/dashboard';
import { getIcon } from '@/lib/iconMapping';
import { useCurrency } from '@/hooks/useCurrency';
import { formatNumber } from '@/lib/utils';
import Spinner from '@/components/ui/Spinner';
import { CalendarPanel } from '@/components/transactions/shared/CalendarPanel';
import { formatDateForDisplay, formatDateToInput } from '@/lib/dateFormatting';

interface TransactionFormProps {
  transaction: Transaction;
  mode: 'add' | 'edit';
  onSave: (transaction: Transaction) => void;
  onCancel: () => void;
  onDelete?: () => void;
  onFloatingPanelToggle?: (isOpen: boolean) => void;
  isSaving?: boolean;
  categories: Category[];
  currencyOptions: Array<{ id: number; name: string; symbol: string; alias: string }>;
}

export default function TransactionForm({
  transaction,
  mode,
  onSave,
  onCancel,
  onDelete,
  onFloatingPanelToggle,
  isSaving = false,
  categories: allCategories,
  currencyOptions,
}: TransactionFormProps) {
  const { currency } = useCurrency();
  const [formData, setFormData] = useState<Transaction>(transaction);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<'expense' | 'income'>(
    transaction.amount < 0 ? 'expense' : transaction.amount > 0 ? 'income' : 'expense'
  );
  const [amountInput, setAmountInput] = useState(
    transaction.amount ? Math.abs(transaction.amount).toString() : ''
  );
  const [dateInput, setDateInput] = useState('');
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const dateDropdownRef = useRef<HTMLDivElement>(null);
  const currencyDropdownRef = useRef<HTMLDivElement>(null);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const initial = formatDateToInput(transaction.date);
    return initial ? new Date(initial) : new Date();
  });

  useEffect(() => {
    // Sync transaction prop to form state - necessary for controlled component
    const transactionToUse = {
      ...transaction,
      name: transaction.fullName || transaction.name,
    };
    // This is intentional - we need to sync props to state for controlled form
    setFormData(transactionToUse);
    // Default to 'expense' if amount is 0 or missing, otherwise determine from amount sign
    setTransactionType(transaction.amount < 0 ? 'expense' : transaction.amount > 0 ? 'income' : 'expense');
    setAmountInput(transaction.amount ? Math.abs(transaction.amount).toString() : '');
    const initial = formatDateToInput(transaction.date);
    setDateInput(initial);
    setCurrentMonth(initial ? new Date(initial) : new Date());
  }, [transaction]);

  // Filter categories by transaction type (client-side filtering)
  const categories = allCategories.filter(cat => {
    // Include categories that match the transaction type or have null type (for both)
    return !cat.type || cat.type === transactionType;
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setIsCategoryOpen(false);
      }
      if (dateDropdownRef.current && !dateDropdownRef.current.contains(event.target as Node)) {
        setIsDateOpen(false);
      }
      if (currencyDropdownRef.current && !currencyDropdownRef.current.contains(event.target as Node)) {
        setIsCurrencyOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    onFloatingPanelToggle?.(isCategoryOpen || isDateOpen || isCurrencyOpen);
  }, [isCategoryOpen, isDateOpen, isCurrencyOpen, onFloatingPanelToggle]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Apply transaction type to amount (negative for expense, positive for income)
    const finalAmount = transactionType === 'expense' ? -formData.amount : formData.amount;
    // Include currencyId in the saved transaction
    onSave({ ...formData, amount: finalAmount, currencyId: formData.currencyId });
  };

  const handleDelete = async () => {
    if (onDelete && window.confirm('Are you sure you want to delete this transaction?')) {
      onDelete();
    }
  };

  // Check if current category is valid for current transaction type
  useEffect(() => {
    if (formData.category && allCategories.length > 0) {
      const currentCategory = allCategories.find(cat => cat.name === formData.category);
      // If category exists but doesn't match current transaction type, clear it
      if (currentCategory && currentCategory.type && currentCategory.type !== transactionType) {
        setFormData(prev => ({
          ...prev,
          category: null,
          icon: 'HelpCircle',
        }));
      }
    }
  }, [transactionType, formData.category, allCategories]);

  const selectedCategory = formData.category
    ? categories.find(category => category.name === formData.category) ?? null
    : null;

  // Get icon component from static map (not creating new component, just getting reference)
  const selectedIconName = selectedCategory?.icon;
  // getIcon returns a component from a static map, not creating a new one
  const SelectedIcon = selectedIconName ? getIcon(selectedIconName) : null;

  const handleCategorySelect = (categoryId: string | null) => {
    if (!categoryId) {
      setFormData(prev => ({
        ...prev,
        category: null,
        icon: 'HelpCircle',
      }));
      setIsCategoryOpen(false);
      return;
    }

    const category = categories.find(item => item.id === categoryId);
    setFormData(prev => ({
      ...prev,
      category: category?.name ?? null,
      icon: category?.icon ?? 'HelpCircle',
    }));
    setIsCategoryOpen(false);
  };

  const handleDateSelect = (value: string) => {
    setDateInput(value);
    setFormData(prev => ({
      ...prev,
      date: formatDateForDisplay(value),
    }));
    if (value) {
      setCurrentMonth(new Date(value));
    }
    setIsDateOpen(false);
  };

  const handleCurrencySelect = (currencyId: number | null) => {
    setFormData(prev => ({
      ...prev,
      currencyId: currencyId ?? undefined,
    }));
    setIsCurrencyOpen(false);
  };

  const selectedCurrency = currencyOptions.find(c => c.id === formData.currencyId) ?? currency;

  // Check if translation is available and different from original
  const hasTranslation = transaction.originalDescription && 
    transaction.originalDescription !== transaction.fullName &&
    transaction.originalDescription.trim() !== '';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-body font-medium mb-2">Transaction Name</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          disabled={isSaving}
          className="w-full px-4 py-2 rounded-xl bg-[#202020] text-body border border-[#3a3a3a] focus:border-[#AC66DA] focus:outline-none transition-colors placeholder:text-[#8C8C8C] disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ color: 'var(--text-primary)' }}
          placeholder="Enter a name"
        />
        {hasTranslation && (
          <div className="mt-2 p-3 rounded-xl bg-[#202020] border border-[#3a3a3a]">
            <div className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
              Original:
            </div>
            <div className="text-sm" style={{ color: 'var(--text-primary)' }}>
              {transaction.originalDescription}
            </div>
            <div className="text-xs mt-2 mb-1" style={{ color: 'var(--text-secondary)' }}>
              Translation:
            </div>
            <div className="text-sm" style={{ color: 'var(--text-primary)' }}>
              {transaction.fullName || transaction.name}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-body font-medium mb-2">Category</label>
          <div className="relative" ref={categoryDropdownRef}>
            <button
              type="button"
              onClick={() => setIsCategoryOpen(prev => !prev)}
              disabled={isSaving}
              className="w-full px-4 py-2 rounded-xl bg-[#202020] text-body border border-[#3a3a3a] focus:border-[#AC66DA] focus:outline-none transition-colors flex items-center justify-between gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ color: 'var(--text-primary)' }}
            >
              <span
                className="flex items-center gap-2 text-body font-semibold"
                style={{ color: selectedCategory ? 'var(--text-primary)' : '#8C8C8C' }}
              >
                {SelectedIcon && (
                  <SelectedIcon width={18} height={18} strokeWidth={1.5} style={{ color: 'var(--text-primary)' }} />
                )}
                {selectedCategory?.name ?? 'Select a category'}
              </span>
              <NavArrowDown width={16} height={16} strokeWidth={2} style={{ color: 'var(--text-primary)' }} />
            </button>

            {isCategoryOpen && (
              <div
                className="absolute top-full left-0 right-0 mt-2 rounded-2xl shadow-lg overflow-hidden z-10 border border-[#3a3a3a]"
                style={{ backgroundColor: '#202020' }}
              >
                <div className="max-h-64 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => handleCategorySelect(null)}
                    className="w-full text-left px-4 py-3 flex items-center gap-3 hover-text-purple transition-colors text-body cursor-pointer"
                    style={{
                      backgroundColor: 'transparent',
                      color: selectedCategory === null ? 'var(--accent-purple)' : 'var(--text-primary)',
                    }}
                  >
                    <span>None</span>
                  </button>
                  {categories.map(category => {
                    const Icon = getIcon(category.icon);
                    const isSelected = selectedCategory?.id === category.id;
                    return (
                      <button
                        type="button"
                        key={category.id}
                        onClick={() => handleCategorySelect(category.id)}
                        className="w-full text-left px-4 py-3 flex items-center gap-3 hover-text-purple transition-colors text-body cursor-pointer"
                        style={{
                          backgroundColor: 'transparent',
                          color: isSelected ? 'var(--accent-purple)' : 'var(--text-primary)',
                        }}
                      >
                        <Icon
                          width={20}
                          height={20}
                          strokeWidth={1.5}
                          style={{ color: isSelected ? 'var(--accent-purple)' : 'var(--text-primary)' }}
                        />
                        <span>{category.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-body font-medium mb-2">Date</label>
          <div className="relative" ref={dateDropdownRef}>
            <button
              type="button"
              onClick={() => setIsDateOpen(prev => !prev)}
              disabled={isSaving}
              className="w-full px-4 py-2 rounded-xl bg-[#202020] text-body border border-[#3a3a3a] focus:border-[#AC66DA] focus:outline-none transition-colors flex items-center justify-between gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ color: 'var(--text-primary)' }}
            >
              <span
                className="text-body font-semibold"
                style={{ color: formData.date ? 'var(--text-primary)' : '#8C8C8C' }}
              >
                {formData.date ? formData.date : 'Select a date'}
              </span>
              <NavArrowDown width={16} height={16} strokeWidth={2} style={{ color: 'var(--text-primary)' }} />
            </button>

            {isDateOpen && (
              <div
                className="absolute top-full left-0 mt-2 rounded-2xl shadow-lg overflow-hidden z-20 border border-[#3a3a3a] w-full"
                style={{ backgroundColor: '#202020' }}
              >
                <CalendarPanel
                  selectedDate={dateInput}
                  currentMonth={currentMonth}
                  onChange={handleDateSelect}
                  onMonthChange={setCurrentMonth}
                  controlAlignment="end"
                />
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-body font-medium mb-2">Currency</label>
          <div className="relative" ref={currencyDropdownRef}>
            <button
              type="button"
              onClick={() => setIsCurrencyOpen(prev => !prev)}
              disabled={isSaving}
              className="w-full px-4 py-2 rounded-xl bg-[#202020] text-body border border-[#3a3a3a] focus:border-[#AC66DA] focus:outline-none transition-colors flex items-center justify-between gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ color: 'var(--text-primary)' }}
            >
              <span className="text-body font-semibold">
                {selectedCurrency ? `${selectedCurrency.symbol} ${selectedCurrency.alias}` : 'Select currency'}
              </span>
              <NavArrowDown width={16} height={16} strokeWidth={2} style={{ color: 'var(--text-primary)' }} />
            </button>

            {isCurrencyOpen && (
              <div
                className="absolute top-full left-0 right-0 mt-2 rounded-2xl shadow-lg overflow-hidden z-10 border border-[#3a3a3a]"
                style={{ backgroundColor: '#202020' }}
              >
                <div className="max-h-64 overflow-y-auto">
                  {currencyOptions.map(currencyOption => {
                    const isSelected = formData.currencyId === currencyOption.id;
                    return (
                      <button
                        type="button"
                        key={currencyOption.id}
                        onClick={() => handleCurrencySelect(currencyOption.id)}
                        className="w-full text-left px-4 py-3 flex items-center gap-3 hover-text-purple transition-colors text-body cursor-pointer"
                        style={{
                          backgroundColor: 'transparent',
                          color: isSelected ? 'var(--accent-purple)' : 'var(--text-primary)',
                        }}
                      >
                        <span className="font-semibold">{currencyOption.symbol}</span>
                        <span>{currencyOption.name} ({currencyOption.alias})</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-body font-medium mb-2">Type</label>
          <div className="relative bg-[#202020] border border-[#3a3a3a] rounded-xl p-0.5 flex gap-0.5 h-[42px]">
            <button
              type="button"
              onClick={() => setTransactionType('expense')}
              disabled={isSaving}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 ${
                transactionType === 'expense'
                  ? 'bg-[#D93F3F] text-white shadow-sm'
                  : 'bg-transparent text-[#8C8C8C] hover:text-[#E7E4E4]'
              }`}
            >
              <ShoppingBag width={14} height={14} strokeWidth={1.5} />
              <span>Expense</span>
            </button>
            <button
              type="button"
              onClick={() => setTransactionType('income')}
              disabled={isSaving}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 ${
                transactionType === 'income'
                  ? 'bg-[#74C648] text-white shadow-sm'
                  : 'bg-transparent text-[#8C8C8C] hover:text-[#E7E4E4]'
              }`}
            >
              <Wallet width={14} height={14} strokeWidth={1.5} />
              <span>Income</span>
            </button>
          </div>
        </div>

        <div>
          <label className="block text-body font-medium mb-2">Amount</label>
          <div className="relative">
            <span 
              className="absolute left-4 top-1/2 -translate-y-1/2 text-body font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              {selectedCurrency.symbol}
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={amountInput}
              onChange={(e) => {
                const sanitized = e.target.value.replace(/[^0-9.,]/g, '');
                setAmountInput(sanitized);
                const numericValue = parseFloat(sanitized.replace(/,/g, '.'));
                setFormData(prev => ({
                  ...prev,
                  amount: Number.isNaN(numericValue) ? 0 : numericValue,
                }));
              }}
              disabled={isSaving}
              className="w-full pl-8 pr-4 py-2 rounded-xl bg-[#202020] text-body border border-[#3a3a3a] focus:border-[#AC66DA] focus:outline-none transition-colors placeholder:text-[#8C8C8C] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ color: 'var(--text-primary)' }}
              placeholder="0.00"
            />
          </div>
          {amountInput && !isNaN(parseFloat(amountInput.replace(/,/g, '.'))) && (
            <div className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              {transactionType === 'expense' ? 'Expense' : 'Income'}: {selectedCurrency.symbol}{formatNumber(parseFloat(amountInput.replace(/,/g, '.')) || 0)}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 pt-4">
        <div className="flex gap-3 items-center justify-end">
          {mode === 'edit' && onDelete && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer hover:bg-[#B82E2E] active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#D93F3F]"
              style={{ backgroundColor: '#D93F3F', color: 'var(--text-primary)' }}
            >
              <Trash width={16} height={16} strokeWidth={1.5} />
              <span>Delete</span>
            </button>
          )}
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed hover:border-[#4a4a4a]"
            style={{ 
              backgroundColor: '#282828', 
              color: 'var(--text-primary)', 
              border: '1px solid #3a3a3a',
            }}
            onMouseEnter={(e) => {
              if (!isSaving) {
                e.currentTarget.style.backgroundColor = '#323232';
                e.currentTarget.style.borderColor = '#4a4a4a';
              }
            }}
            onMouseLeave={(e) => {
              if (!isSaving) {
                e.currentTarget.style.backgroundColor = '#282828';
                e.currentTarget.style.borderColor = '#3a3a3a';
              }
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="px-5 py-2 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{ backgroundColor: 'var(--accent-purple)', color: 'var(--text-primary)' }}
            onMouseEnter={(e) => {
              if (!isSaving) {
                e.currentTarget.style.backgroundColor = '#9A4FB8';
              }
            }}
            onMouseLeave={(e) => {
              if (!isSaving) {
                e.currentTarget.style.backgroundColor = 'var(--accent-purple)';
              }
            }}
          >
            {isSaving ? (
              <>
                <Spinner size={16} color="var(--text-primary)" />
                <span>Saving...</span>
              </>
            ) : (
              <span>{mode === 'add' ? 'Add Transaction' : 'Save Changes'}</span>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}