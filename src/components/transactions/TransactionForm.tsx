'use client';

import { useState, useEffect, useRef, CSSProperties } from 'react';
import { NavArrowDown, NavArrowLeft, NavArrowRight, Trash } from 'iconoir-react';
import { Transaction } from '@/types/dashboard';
import { getIcon } from '@/lib/iconMapping';
import { mockCategories } from '@/lib/mockData';
import { useCurrency } from '@/hooks/useCurrency';
import { formatNumber } from '@/lib/utils';

interface TransactionFormProps {
  transaction: Transaction;
  mode: 'add' | 'edit';
  onSave: (transaction: Transaction) => void;
  onCancel: () => void;
  onDelete?: () => void;
  onFloatingPanelToggle?: (isOpen: boolean) => void;
}

interface CalendarPanelProps {
  selectedDate: string;
  currentMonth: Date;
  onChange: (value: string) => void;
  onMonthChange: (date: Date) => void;
  controlAlignment?: 'start' | 'center' | 'end';
}

export default function TransactionForm({
  transaction,
  mode,
  onSave,
  onCancel,
  onDelete,
  onFloatingPanelToggle,
}: TransactionFormProps) {
  const { currency } = useCurrency();
  const [formData, setFormData] = useState<Transaction>(transaction);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<'expense' | 'income'>(
    transaction.amount < 0 ? 'expense' : 'income'
  );
  const [amountInput, setAmountInput] = useState(
    transaction.amount ? Math.abs(transaction.amount).toString() : ''
  );
  const [dateInput, setDateInput] = useState('');
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const dateDropdownRef = useRef<HTMLDivElement>(null);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const initial = formatDateToInput(transaction.date);
    return initial ? new Date(initial) : new Date();
  });

  useEffect(() => {
    // Use fullName if available (for transaction modal), otherwise use name
    const transactionToUse = {
      ...transaction,
      name: transaction.fullName || transaction.name,
    };
    setFormData(transactionToUse);
    setTransactionType(transaction.amount < 0 ? 'expense' : 'income');
    setAmountInput(transaction.amount ? Math.abs(transaction.amount).toString() : '');
    const initial = formatDateToInput(transaction.date);
    setDateInput(initial);
    setCurrentMonth(initial ? new Date(initial) : new Date());
  }, [transaction]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setIsCategoryOpen(false);
      }
      if (dateDropdownRef.current && !dateDropdownRef.current.contains(event.target as Node)) {
        setIsDateOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    onFloatingPanelToggle?.(isCategoryOpen || isDateOpen);
  }, [isCategoryOpen, isDateOpen, onFloatingPanelToggle]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Apply transaction type to amount (negative for expense, positive for income)
    const finalAmount = transactionType === 'expense' ? -formData.amount : formData.amount;
    onSave({ ...formData, amount: finalAmount });
  };

  const handleDelete = async () => {
    if (onDelete && window.confirm('Are you sure you want to delete this transaction?')) {
      onDelete();
    }
  };

  const selectedCategory = formData.category
    ? mockCategories.find(category => category.name === formData.category) ?? null
    : null;

  const SelectedIcon = selectedCategory ? getIcon(selectedCategory.icon) : null;

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

    const category = mockCategories.find(item => item.id === categoryId);
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
          className="w-full px-4 py-2 rounded-xl bg-[#202020] text-body border border-[#3a3a3a] focus:border-[#AC66DA] focus:outline-none transition-colors placeholder:text-[#8C8C8C]"
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
              className="w-full px-4 py-2 rounded-xl bg-[#202020] text-body border border-[#3a3a3a] focus:border-[#AC66DA] focus:outline-none transition-colors flex items-center justify-between gap-2"
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
                  {mockCategories.map(category => {
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
              className="w-full px-4 py-2 rounded-xl bg-[#202020] text-body border border-[#3a3a3a] focus:border-[#AC66DA] focus:outline-none transition-colors flex items-center justify-between gap-2"
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
      </div>

      <div>
        <label className="block text-body font-medium mb-2">Type</label>
        <div className="flex gap-3 mb-4">
          <button
            type="button"
            onClick={() => setTransactionType('expense')}
            className={`flex-1 px-4 py-2 rounded-xl text-body font-semibold transition-colors ${
              transactionType === 'expense'
                ? 'text-white'
                : 'border border-[#3a3a3a]'
            }`}
            style={{
              backgroundColor: transactionType === 'expense' ? '#D93F3F' : 'transparent',
              color: transactionType === 'expense' ? 'var(--text-primary)' : 'var(--text-primary)',
            }}
          >
            Expense
          </button>
          <button
            type="button"
            onClick={() => setTransactionType('income')}
            className={`flex-1 px-4 py-2 rounded-xl text-body font-semibold transition-colors ${
              transactionType === 'income'
                ? 'text-white'
                : 'border border-[#3a3a3a]'
            }`}
            style={{
              backgroundColor: transactionType === 'income' ? '#74C648' : 'transparent',
              color: transactionType === 'income' ? 'var(--text-primary)' : 'var(--text-primary)',
            }}
          >
            Income
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
            {currency.symbol}
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
            className="w-full pl-8 pr-4 py-2 rounded-xl bg-[#202020] text-body border border-[#3a3a3a] focus:border-[#AC66DA] focus:outline-none transition-colors placeholder:text-[#8C8C8C]"
            style={{ color: 'var(--text-primary)' }}
            placeholder="0.00"
          />
        </div>
        {amountInput && !isNaN(parseFloat(amountInput.replace(/,/g, '.'))) && (
          <div className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {transactionType === 'expense' ? 'Expense' : 'Income'}: {currency.symbol}{formatNumber(parseFloat(amountInput.replace(/,/g, '.')) || 0)}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 pt-4">
        <div className="flex gap-4">
          {mode === 'edit' && onDelete && (
            <button
              type="button"
              onClick={handleDelete}
              className="px-6 py-3 rounded-full text-body font-semibold transition-colors cursor-pointer hover:opacity-90 flex items-center justify-center gap-2"
              style={{ backgroundColor: '#D93F3F', color: 'var(--text-primary)' }}
            >
              <Trash width={18} height={18} strokeWidth={1.5} />
              Delete
            </button>
          )}
          <button
            type="button"
            onClick={onCancel}
            className={`px-6 py-3 rounded-full text-body font-semibold transition-colors cursor-pointer hover:opacity-80 ${
              mode === 'edit' && onDelete ? 'flex-1' : 'flex-1'
            }`}
            style={{ backgroundColor: '#3a3a3a' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 px-6 py-3 rounded-full text-body font-semibold transition-colors cursor-pointer hover:opacity-90"
            style={{ backgroundColor: 'var(--accent-purple)', color: 'var(--text-primary)' }}
          >
            {mode === 'add' ? 'Add Transaction' : 'Save Changes'}
          </button>
        </div>
      </div>
    </form>
  );
}

function formatDateForDisplay(value: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const day = date.getDate();
  const suffix =
    day % 10 === 1 && day !== 11
      ? 'st'
      : day % 10 === 2 && day !== 12
      ? 'nd'
      : day % 10 === 3 && day !== 13
      ? 'rd'
      : 'th';

  const month = date.toLocaleString('en-US', { month: 'short' });
  const year = date.getFullYear();

  return `${month} ${day}${suffix} ${year}`;
}

function formatDateToInput(value: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    const cleaned = value.replace(/(\d+)(st|nd|rd|th)/, '$1');
    const parsed = new Date(cleaned);
    if (Number.isNaN(parsed.getTime())) return '';
    return parsed.toISOString().slice(0, 10);
  }
  return date.toISOString().slice(0, 10);
}

function CalendarPanel({ selectedDate, currentMonth, onChange, onMonthChange, controlAlignment = 'center' }: CalendarPanelProps) {
  const today = new Date();
  const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

  const startWeekDay = startOfMonth.getDay(); // 0 (Sun) - 6 (Sat)
  const days: Date[] = [];
  const startDate = new Date(startOfMonth);
  startDate.setDate(startOfMonth.getDate() - startWeekDay);

  for (let i = 0; i < 42; i += 1) {
    const day = new Date(startDate);
    day.setDate(startDate.getDate() + i);
    days.push(day);
  }

  const selected = selectedDate ? new Date(selectedDate) : null;

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const monthLabel = currentMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="p-3 space-y-3">
      <div className={`flex items-center ${controlAlignment === 'end' ? 'justify-end gap-2' : 'justify-between'}`}>
        <button
          type="button"
          onClick={() =>
            onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
          }
          className="p-2 rounded-full hover-text-purple transition-colors cursor-pointer"
          aria-label="Previous month"
        >
          <NavArrowLeft width={18} height={18} strokeWidth={1.5} />
        </button>
        {controlAlignment !== 'end' && (
          <span className="text-body font-semibold">{monthLabel}</span>
        )}
        <button
          type="button"
          onClick={() =>
            onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
          }
          className="p-2 rounded-full hover-text-purple transition-colors cursor-pointer"
          aria-label="Next month"
        >
          <NavArrowRight width={18} height={18} strokeWidth={1.5} />
        </button>
        {controlAlignment === 'end' && (
          <span className="text-body font-semibold ml-2">{monthLabel}</span>
        )}
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-helper text-[10px] uppercase tracking-wide">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const isCurrentMonth =
            day.getMonth() === currentMonth.getMonth() && day.getFullYear() === currentMonth.getFullYear();
          const isToday = isSameDay(day, today);
          const isSelected = selected && isSameDay(day, selected);

          const buttonClasses = ['h-9 rounded-xl text-body font-medium transition-colors cursor-pointer'];
          const buttonStyle: CSSProperties = {
            backgroundColor: '#1f1f1f',
            color: 'var(--text-primary)',
          };

          if (isSelected) {
            buttonClasses.push('text-black');
            buttonStyle.backgroundColor = 'var(--accent-purple)';
          } else if (isToday) {
            buttonClasses.push('border');
            buttonStyle.borderColor = 'var(--accent-purple)';
            buttonStyle.borderWidth = '1px';
          }

          if (!isCurrentMonth) {
            buttonClasses.push('opacity-40');
          }

          return (
            <button
              type="button"
              key={day.toISOString()}
              onClick={() => onChange(day.toISOString().slice(0, 10))}
              className={buttonClasses.join(' ')}
              style={buttonStyle}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
