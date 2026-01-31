'use client';

import { useState, useEffect, useRef, useLayoutEffect, useCallback, CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { NavArrowDown, Trash, ShoppingBag, Wallet, Language, Pause, Play } from 'iconoir-react';
import { Transaction, Category, RecurringFrequencyUnit } from '@/types/dashboard';
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
  onPauseResume?: (recurringId: number, isActive: boolean) => void;
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
  onPauseResume,
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
  const [recurringEnabled, setRecurringEnabled] = useState<boolean>(transaction.recurring?.isRecurring ?? false);
  const [recurringUnit, setRecurringUnit] = useState<RecurringFrequencyUnit>(transaction.recurring?.frequencyUnit ?? 'month');
  const [recurringInterval, setRecurringInterval] = useState<number>(transaction.recurring?.frequencyInterval ?? 1);
  const [recurringStartDate, setRecurringStartDate] = useState<string>('');
  const [recurringEndDate, setRecurringEndDate] = useState<string>('');
  const [isRecurringStartOpen, setIsRecurringStartOpen] = useState(false);
  const [isRecurringEndOpen, setIsRecurringEndOpen] = useState(false);
  const [isRecurringUnitOpen, setIsRecurringUnitOpen] = useState(false);
  const [recurringUnitOpenUpward, setRecurringUnitOpenUpward] = useState(false);
  const [recurringStartMonth, setRecurringStartMonth] = useState<Date>(() => {
    if (transaction.recurring?.startDate) return new Date(transaction.recurring.startDate);
    const initial = formatDateToInput(transaction.date);
    return initial ? new Date(initial) : new Date();
  });
  const [recurringEndMonth, setRecurringEndMonth] = useState<Date>(() => {
    if (transaction.recurring?.endDate) return new Date(transaction.recurring.endDate);
    const initial = formatDateToInput(transaction.date);
    return initial ? new Date(initial) : new Date();
  });
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const dateDropdownRef = useRef<HTMLDivElement>(null);
  const dateTriggerRef = useRef<HTMLButtonElement>(null);
  const datePortalRef = useRef<HTMLDivElement>(null);
  const currencyDropdownRef = useRef<HTMLDivElement>(null);
  const currencyTriggerRef = useRef<HTMLButtonElement>(null);
  const currencyPortalRef = useRef<HTMLDivElement>(null);
  const recurringStartDropdownRef = useRef<HTMLDivElement>(null);
  const recurringStartTriggerRef = useRef<HTMLButtonElement>(null);
  const recurringStartPortalRef = useRef<HTMLDivElement>(null);
  const recurringEndDropdownRef = useRef<HTMLDivElement>(null);
  const recurringEndTriggerRef = useRef<HTMLButtonElement>(null);
  const recurringEndPortalRef = useRef<HTMLDivElement>(null);
  const recurringUnitDropdownRef = useRef<HTMLDivElement>(null);
  const recurringUnitTriggerRef = useRef<HTMLButtonElement>(null);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const initial = formatDateToInput(transaction.date);
    return initial ? new Date(initial) : new Date();
  });
  
  // Portal positioning state for date dropdown
  const [dateDropdownStyle, setDateDropdownStyle] = useState<CSSProperties | null>(null);
  const [dateOpenUpward, setDateOpenUpward] = useState(false);
  
  // Portal positioning state for currency dropdown
  const [currencyDropdownStyle, setCurrencyDropdownStyle] = useState<CSSProperties | null>(null);
  const [currencyOpenUpward, setCurrencyOpenUpward] = useState(false);
  const [recurringStartDropdownStyle, setRecurringStartDropdownStyle] = useState<CSSProperties | null>(null);
  const [recurringStartOpenUpward, setRecurringStartOpenUpward] = useState(false);
  const [recurringEndDropdownStyle, setRecurringEndDropdownStyle] = useState<CSSProperties | null>(null);
  const [recurringEndOpenUpward, setRecurringEndOpenUpward] = useState(false);

  useEffect(() => {
    // Sync transaction prop to form state - necessary for controlled component
    // Use originalDescription for the name field (what user sees and edits)
    const transactionToUse = {
      ...transaction,
      name: transaction.originalDescription || transaction.fullName || transaction.name,
    };
    // This is intentional - we need to sync props to state for controlled form
    setFormData(transactionToUse);
    // Default to 'expense' if amount is 0 or missing, otherwise determine from amount sign
    setTransactionType(transaction.amount < 0 ? 'expense' : transaction.amount > 0 ? 'income' : 'expense');
    setAmountInput(transaction.amount ? Math.abs(transaction.amount).toString() : '');
    const initial = formatDateToInput(transaction.date);
    setDateInput(initial);
    setCurrentMonth(initial ? new Date(initial) : new Date());
    setRecurringEnabled(transaction.recurring?.isRecurring ?? false);
    setRecurringUnit(transaction.recurring?.frequencyUnit ?? 'month');
    setRecurringInterval(transaction.recurring?.frequencyInterval ?? 1);
    const recurringStart = transaction.recurring?.startDate ?? initial ?? '';
    const recurringEnd = transaction.recurring?.endDate ?? '';
    setRecurringStartDate(recurringStart);
    setRecurringEndDate(recurringEnd);
    if (recurringStart) {
      setRecurringStartMonth(new Date(recurringStart));
    }
    if (recurringEnd) {
      setRecurringEndMonth(new Date(recurringEnd));
    }
  }, [transaction]);

  // Filter categories by transaction type (client-side filtering)
  const categories = allCategories.filter(cat => {
    // Include categories that match the transaction type or have null type (for both)
    return !cat.type || cat.type === transactionType;
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      // Category dropdown (absolute positioning)
      if (isCategoryOpen && categoryDropdownRef.current && !categoryDropdownRef.current.contains(target)) {
        setIsCategoryOpen(false);
      }
      
      // Date dropdown (portal) - check both container and portal ref
      if (isDateOpen && 
          dateDropdownRef.current && 
          !dateDropdownRef.current.contains(target) &&
          (!datePortalRef.current || !datePortalRef.current.contains(target))) {
        setIsDateOpen(false);
      }
      
      // Currency dropdown (portal) - check both container and portal ref
      if (isCurrencyOpen && 
          currencyDropdownRef.current && 
          !currencyDropdownRef.current.contains(target) &&
          (!currencyPortalRef.current || !currencyPortalRef.current.contains(target))) {
        setIsCurrencyOpen(false);
      }

      if (isRecurringStartOpen &&
          recurringStartDropdownRef.current &&
          !recurringStartDropdownRef.current.contains(target) &&
          (!recurringStartPortalRef.current || !recurringStartPortalRef.current.contains(target))) {
        setIsRecurringStartOpen(false);
      }

      if (isRecurringEndOpen &&
          recurringEndDropdownRef.current &&
          !recurringEndDropdownRef.current.contains(target) &&
          (!recurringEndPortalRef.current || !recurringEndPortalRef.current.contains(target))) {
        setIsRecurringEndOpen(false);
      }

      if (isRecurringUnitOpen &&
          recurringUnitDropdownRef.current &&
          !recurringUnitDropdownRef.current.contains(target)) {
        setIsRecurringUnitOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCategoryOpen, isDateOpen, isCurrencyOpen, isRecurringStartOpen, isRecurringEndOpen, isRecurringUnitOpen]);

  useEffect(() => {
    if (!isRecurringUnitOpen || !recurringUnitTriggerRef.current) return;
    const triggerRect = recurringUnitTriggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - triggerRect.bottom;
    const estimatedHeight = 220; // approx menu height
    setRecurringUnitOpenUpward(spaceBelow < estimatedHeight);
  }, [isRecurringUnitOpen]);

  useEffect(() => {
    onFloatingPanelToggle?.(isCategoryOpen);
  }, [isCategoryOpen, onFloatingPanelToggle]);

  // Position calculation for date dropdown portal
  const updateDateDropdownPosition = useCallback(() => {
    if (!isDateOpen || !dateTriggerRef.current || !datePortalRef.current) return;
    const margin = 8;
    const triggerRect = dateTriggerRef.current.getBoundingClientRect();
    const dropdownRect = datePortalRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - triggerRect.bottom;
    const spaceAbove = triggerRect.top;
    const shouldOpenUp = dropdownRect.height + margin > spaceBelow && spaceAbove > spaceBelow;

    const top = shouldOpenUp
      ? Math.max(margin, triggerRect.top - dropdownRect.height - margin)
      : Math.min(window.innerHeight - dropdownRect.height - margin, triggerRect.bottom + margin);

    const maxLeft = window.innerWidth - dropdownRect.width - margin;
    const left = Math.min(Math.max(triggerRect.left, margin), Math.max(margin, maxLeft));

    setDateOpenUpward(shouldOpenUp);
    setDateDropdownStyle({
      position: 'fixed',
      minWidth: '320px',
      width: 'max-content',
      left,
      top,
      zIndex: 1000,
    });
  }, [isDateOpen]);

  useLayoutEffect(() => {
    if (!isDateOpen) {
      setDateDropdownStyle(null);
      return;
    }

    updateDateDropdownPosition();
    window.addEventListener('resize', updateDateDropdownPosition);
    window.addEventListener('scroll', updateDateDropdownPosition, true);

    return () => {
      window.removeEventListener('resize', updateDateDropdownPosition);
      window.removeEventListener('scroll', updateDateDropdownPosition, true);
    };
  }, [isDateOpen, updateDateDropdownPosition]);

  // Position calculation for currency dropdown portal
  const updateCurrencyDropdownPosition = useCallback(() => {
    if (!isCurrencyOpen || !currencyTriggerRef.current || !currencyPortalRef.current) return;
    const margin = 8;
    const triggerRect = currencyTriggerRef.current.getBoundingClientRect();
    const dropdownRect = currencyPortalRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - triggerRect.bottom;
    const spaceAbove = triggerRect.top;
    const shouldOpenUp = dropdownRect.height + margin > spaceBelow && spaceAbove > spaceBelow;

    const top = shouldOpenUp
      ? Math.max(margin, triggerRect.top - dropdownRect.height - margin)
      : Math.min(window.innerHeight - dropdownRect.height - margin, triggerRect.bottom + margin);

    const maxLeft = window.innerWidth - triggerRect.width - margin;
    const left = Math.min(Math.max(triggerRect.left, margin), Math.max(margin, maxLeft));

    setCurrencyOpenUpward(shouldOpenUp);
    setCurrencyDropdownStyle({
      position: 'fixed',
      width: triggerRect.width,
      left,
      top,
      zIndex: 1000,
    });
  }, [isCurrencyOpen]);

  const updateRecurringStartDropdownPosition = useCallback(() => {
    if (!isRecurringStartOpen || !recurringStartTriggerRef.current || !recurringStartPortalRef.current) return;
    const margin = 8;
    const triggerRect = recurringStartTriggerRef.current.getBoundingClientRect();
    const dropdownRect = recurringStartPortalRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - triggerRect.bottom;
    const spaceAbove = triggerRect.top;
    const shouldOpenUp = dropdownRect.height + margin > spaceBelow && spaceAbove > spaceBelow;

    const top = shouldOpenUp
      ? Math.max(margin, triggerRect.top - dropdownRect.height - margin)
      : Math.min(window.innerHeight - dropdownRect.height - margin, triggerRect.bottom + margin);

    const maxLeft = window.innerWidth - dropdownRect.width - margin;
    const left = Math.min(Math.max(triggerRect.left, margin), Math.max(margin, maxLeft));

    setRecurringStartOpenUpward(shouldOpenUp);
    setRecurringStartDropdownStyle({
      position: 'fixed',
      minWidth: '320px',
      width: 'max-content',
      left,
      top,
      zIndex: 1000,
    });
  }, [isRecurringStartOpen]);

  const updateRecurringEndDropdownPosition = useCallback(() => {
    if (!isRecurringEndOpen || !recurringEndTriggerRef.current || !recurringEndPortalRef.current) return;
    const margin = 8;
    const triggerRect = recurringEndTriggerRef.current.getBoundingClientRect();
    const dropdownRect = recurringEndPortalRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - triggerRect.bottom;
    const spaceAbove = triggerRect.top;
    const shouldOpenUp = dropdownRect.height + margin > spaceBelow && spaceAbove > spaceBelow;

    const top = shouldOpenUp
      ? Math.max(margin, triggerRect.top - dropdownRect.height - margin)
      : Math.min(window.innerHeight - dropdownRect.height - margin, triggerRect.bottom + margin);

    const maxLeft = window.innerWidth - dropdownRect.width - margin;
    const left = Math.min(Math.max(triggerRect.left, margin), Math.max(margin, maxLeft));

    setRecurringEndOpenUpward(shouldOpenUp);
    setRecurringEndDropdownStyle({
      position: 'fixed',
      minWidth: '320px',
      width: 'max-content',
      left,
      top,
      zIndex: 1000,
    });
  }, [isRecurringEndOpen]);

  useLayoutEffect(() => {
    if (!isCurrencyOpen) {
      setCurrencyDropdownStyle(null);
      return;
    }

    updateCurrencyDropdownPosition();
    window.addEventListener('resize', updateCurrencyDropdownPosition);
    window.addEventListener('scroll', updateCurrencyDropdownPosition, true);

    return () => {
      window.removeEventListener('resize', updateCurrencyDropdownPosition);
      window.removeEventListener('scroll', updateCurrencyDropdownPosition, true);
    };
  }, [isCurrencyOpen, updateCurrencyDropdownPosition]);

  useLayoutEffect(() => {
    if (!isRecurringStartOpen) {
      setRecurringStartDropdownStyle(null);
      return;
    }

    updateRecurringStartDropdownPosition();
    window.addEventListener('resize', updateRecurringStartDropdownPosition);
    window.addEventListener('scroll', updateRecurringStartDropdownPosition, true);

    return () => {
      window.removeEventListener('resize', updateRecurringStartDropdownPosition);
      window.removeEventListener('scroll', updateRecurringStartDropdownPosition, true);
    };
  }, [isRecurringStartOpen, updateRecurringStartDropdownPosition]);

  useLayoutEffect(() => {
    if (!isRecurringEndOpen) {
      setRecurringEndDropdownStyle(null);
      return;
    }

    updateRecurringEndDropdownPosition();
    window.addEventListener('resize', updateRecurringEndDropdownPosition);
    window.addEventListener('scroll', updateRecurringEndDropdownPosition, true);

    return () => {
      window.removeEventListener('resize', updateRecurringEndDropdownPosition);
      window.removeEventListener('scroll', updateRecurringEndDropdownPosition, true);
    };
  }, [isRecurringEndOpen, updateRecurringEndDropdownPosition]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Apply transaction type to amount (negative for expense, positive for income)
    const finalAmount = transactionType === 'expense' ? -formData.amount : formData.amount;
    // When adding, transaction date is the first occurrence so it is the start date; when editing, allow explicit start date.
    const startDateForRecurring = mode === 'add' ? dateInput : (recurringStartDate || dateInput);
    const recurringPayload = recurringEnabled
      ? {
          isRecurring: true,
          frequencyUnit: recurringUnit,
          frequencyInterval: Math.max(1, recurringInterval || 1),
          startDate: startDateForRecurring,
          endDate: recurringEndDate || null,
          type: transactionType,
          isActive: transaction.recurringId !== undefined ? (transaction.recurring?.isActive ?? true) : undefined,
        }
      : undefined;
    // Include currencyId in the saved transaction
    onSave({
      ...formData,
      amount: finalAmount,
      currencyId: formData.currencyId,
      recurring: recurringPayload,
    });
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

  const handleRecurringStartSelect = (value: string) => {
    setRecurringStartDate(value);
    setRecurringStartMonth(new Date(value));
    setIsRecurringStartOpen(false);
  };

  const handleRecurringEndSelect = (value: string) => {
    setRecurringEndDate(value);
    setRecurringEndMonth(new Date(value));
    setIsRecurringEndOpen(false);
  };

  const handleCurrencySelect = (currencyId: number | null) => {
    setFormData(prev => ({
      ...prev,
      currencyId: currencyId ?? undefined,
    }));
    setIsCurrencyOpen(false);
  };

  const selectedCurrency = currencyOptions.find(c => c.id === formData.currencyId) ?? currency;

  // Get the original description and translated version
  const originalDescription = transaction.originalDescription || transaction.name;
  const translatedDescription = transaction.fullName || transaction.name;
  
  // Check if translation is available and different from original
  // Translation exists if original has Georgian characters and translated version is different
  const hasGeorgianInOriginal = /[\u10A0-\u10FF]/.test(originalDescription || '');
  const hasTranslation = originalDescription && 
    translatedDescription &&
    originalDescription !== translatedDescription &&
    originalDescription.trim() !== '' &&
    translatedDescription.trim() !== '' &&
    hasGeorgianInOriginal;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-body font-medium mb-2">Transaction Name</label>
        <div className="space-y-1.5">
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            disabled={isSaving}
            className="w-full px-4 py-2 rounded-xl bg-[#202020] text-body border border-[#3a3a3a] focus:border-[#AC66DA] focus:outline-none transition-colors placeholder:text-[#8C8C8C] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ color: 'var(--text-primary)' }}
            placeholder="Enter a name"
            title={formData.name}
          />
          {hasTranslation && (
            <div className="flex items-center gap-1.5 text-xs min-w-0" style={{ color: 'var(--text-secondary)' }}>
              <Language width={14} height={14} strokeWidth={1.5} className="shrink-0" style={{ color: 'var(--text-secondary)' }} />
              <span className="truncate" title={translatedDescription}>
                {translatedDescription}
              </span>
            </div>
          )}
        </div>
      </div>

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-body font-medium mb-2">Date</label>
          <div className="relative" ref={dateDropdownRef}>
            <button
              type="button"
              ref={dateTriggerRef}
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

            {isDateOpen && typeof document !== 'undefined' && createPortal(
              <div
                ref={datePortalRef}
                className="rounded-2xl shadow-lg border border-[#3a3a3a] overflow-hidden"
                style={{
                  backgroundColor: '#202020',
                  ...(dateDropdownStyle ?? {
                    position: 'fixed',
                    top: -9999,
                    left: -9999,
                    zIndex: 1000,
                    minWidth: '320px',
                    width: 'max-content',
                  }),
                }}
              >
                <CalendarPanel
                  selectedDate={dateInput}
                  currentMonth={currentMonth}
                  onChange={handleDateSelect}
                  onMonthChange={setCurrentMonth}
                  controlAlignment="end"
                />
              </div>,
              document.body,
            )}
          </div>
        </div>

        <div>
          <label className="block text-body font-medium mb-2">Currency</label>
          <div className="relative" ref={currencyDropdownRef}>
            <button
              type="button"
              ref={currencyTriggerRef}
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

            {isCurrencyOpen && typeof document !== 'undefined' && createPortal(
              <div
                ref={currencyPortalRef}
                className={`rounded-2xl shadow-lg overflow-hidden border border-[#3a3a3a] ${currencyOpenUpward ? 'origin-bottom' : 'origin-top'}`}
                style={{
                  backgroundColor: '#202020',
                  ...(currencyDropdownStyle ?? {
                    position: 'fixed',
                    top: -9999,
                    left: -9999,
                    zIndex: 1000,
                    width: currencyTriggerRef.current?.getBoundingClientRect().width,
                  }),
                }}
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
              </div>,
              document.body,
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
        </div>
      </div>

      <div className="rounded-2xl border border-[#3a3a3a] p-4 bg-[#202020] flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-body font-medium">Recurring</p>
            <p className="text-helper">
              {mode === 'add'
                ? 'Starts on the date above. Auto-creates on the next due date.'
                : 'Auto-create on the next due date'}
            </p>
          </div>
          <label className={`inline-flex items-center select-none ${transaction.recurringId === undefined ? 'cursor-pointer' : 'cursor-default'}`}>
            <span className="sr-only">Toggle recurring</span>
            <input
              type="checkbox"
              className="hidden"
              checked={recurringEnabled}
              onChange={() => transaction.recurringId === undefined && setRecurringEnabled(prev => !prev)}
              disabled={isSaving || transaction.recurringId !== undefined}
            />
            <div
              className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ${recurringEnabled ? 'bg-[#AC66DA]' : 'bg-[#3a3a3a]'}`}
            >
              <div
                className={`w-4 h-4 rounded-full transition-transform duration-200 ${recurringEnabled ? 'translate-x-6' : ''}`}
                style={{ backgroundColor: 'var(--text-primary)' }}
              />
            </div>
          </label>
        </div>

        {recurringEnabled && (
          <div className={`grid grid-cols-1 gap-3 ${mode === 'edit' ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
            {/* Start Date only when editing: when adding, the transaction date above is the first occurrence and is used as start date */}
            {mode === 'edit' && (
              <div className="flex flex-col gap-2">
                <label className="text-body font-medium">Start Date</label>
                <div className="relative" ref={recurringStartDropdownRef}>
                  <button
                    type="button"
                    ref={recurringStartTriggerRef}
                    onClick={() => setIsRecurringStartOpen(prev => !prev)}
                    disabled={isSaving}
                    className="w-full px-4 py-2 rounded-xl bg-[#202020] text-body border border-[#3a3a3a] focus:border-[#AC66DA] focus:outline-none transition-colors flex items-center justify-between gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    <span
                      className="text-body font-semibold"
                      style={{ color: recurringStartDate ? 'var(--text-primary)' : '#8C8C8C' }}
                    >
                      {recurringStartDate ? formatDateForDisplay(recurringStartDate) : 'Select start date'}
                    </span>
                    <NavArrowDown width={16} height={16} strokeWidth={2} style={{ color: 'var(--text-primary)' }} />
                  </button>

                  {isRecurringStartOpen && typeof document !== 'undefined' && createPortal(
                    <div
                      ref={recurringStartPortalRef}
                      className="rounded-2xl shadow-lg border border-[#3a3a3a] overflow-hidden"
                      style={{
                        backgroundColor: '#202020',
                        ...(recurringStartDropdownStyle ?? {
                          position: 'fixed',
                          top: -9999,
                          left: -9999,
                          zIndex: 1000,
                          minWidth: '320px',
                          width: 'max-content',
                        }),
                      }}
                    >
                      <CalendarPanel
                        selectedDate={recurringStartDate}
                        currentMonth={recurringStartMonth}
                        onChange={handleRecurringStartSelect}
                        onMonthChange={setRecurringStartMonth}
                        controlAlignment="end"
                      />
                    </div>,
                    document.body,
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label className="text-body font-medium">Frequency</label>
              <div className="grid grid-cols-5 gap-2" ref={recurringUnitDropdownRef}>
                <input
                  type="number"
                  min={1}
                  value={recurringInterval}
                  onChange={(e) => setRecurringInterval(parseInt(e.target.value, 10) || 1)}
                  disabled={isSaving}
                  className="col-span-2 px-4 py-2 rounded-xl bg-[#202020] text-body border border-[#3a3a3a] focus:border-[#AC66DA] focus:outline-none transition-colors placeholder:text-[#8C8C8C] disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ color: 'var(--text-primary)' }}
                />
                <div className="col-span-3 relative">
                  <button
                    type="button"
                    ref={recurringUnitTriggerRef}
                    onClick={() => setIsRecurringUnitOpen(prev => !prev)}
                    disabled={isSaving}
                    className="w-full px-4 py-2 rounded-xl bg-[#202020] text-body border border-[#3a3a3a] focus:border-[#AC66DA] focus:outline-none transition-colors flex items-center justify-between gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    <span className="text-body font-semibold capitalize">{recurringUnit}</span>
                    <NavArrowDown width={16} height={16} strokeWidth={2} style={{ color: 'var(--text-primary)' }} />
                  </button>
                  {isRecurringUnitOpen && (
                    <div
                      className={`absolute left-0 right-0 rounded-2xl shadow-lg overflow-hidden border border-[#3a3a3a] z-10 ${recurringUnitOpenUpward ? 'bottom-full mb-2' : 'top-full mt-2'}`}
                      style={{ backgroundColor: '#202020' }}
                    >
                      {(['day', 'week', 'month', 'year'] as RecurringFrequencyUnit[]).map((unit) => (
                        <button
                          key={unit}
                          type="button"
                          onClick={() => {
                            setRecurringUnit(unit);
                            setIsRecurringUnitOpen(false);
                          }}
                          className="w-full text-left px-4 py-3 flex items-center justify-between gap-3 hover-text-purple transition-colors text-body cursor-pointer"
                          style={{
                            backgroundColor: 'transparent',
                            color: recurringUnit === unit ? 'var(--accent-purple)' : 'var(--text-primary)',
                          }}
                        >
                          <span className="capitalize">{unit}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-body font-medium">End Date (optional)</label>
              <div className="relative" ref={recurringEndDropdownRef}>
                <button
                  type="button"
                  ref={recurringEndTriggerRef}
                  onClick={() => setIsRecurringEndOpen(prev => !prev)}
                  disabled={isSaving}
                  className="w-full px-4 py-2 rounded-xl bg-[#202020] text-body border border-[#3a3a3a] focus:border-[#AC66DA] focus:outline-none transition-colors flex items-center justify-between gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <span
                    className="text-body font-semibold"
                    style={{ color: recurringEndDate ? 'var(--text-primary)' : '#8C8C8C' }}
                  >
                    {recurringEndDate ? formatDateForDisplay(recurringEndDate) : 'No end date'}
                  </span>
                  <NavArrowDown width={16} height={16} strokeWidth={2} style={{ color: 'var(--text-primary)' }} />
                </button>

                {isRecurringEndOpen && typeof document !== 'undefined' && createPortal(
                  <div
                    ref={recurringEndPortalRef}
                    className="rounded-2xl shadow-lg border border-[#3a3a3a] overflow-hidden"
                    style={{
                      backgroundColor: '#202020',
                      ...(recurringEndDropdownStyle ?? {
                        position: 'fixed',
                        top: -9999,
                        left: -9999,
                        zIndex: 1000,
                        minWidth: '320px',
                        width: 'max-content',
                      }),
                    }}
                  >
                    <CalendarPanel
                      selectedDate={recurringEndDate}
                      currentMonth={recurringEndMonth}
                      onChange={handleRecurringEndSelect}
                      onMonthChange={setRecurringEndMonth}
                      controlAlignment="end"
                    />
                  </div>,
                  document.body,
                )}
              </div>
            </div>

          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 pt-4">
        <div className="flex gap-3 items-center justify-end">
          {transaction.recurringId !== undefined && onPauseResume && (
            transaction.recurring?.isActive !== false ? (
              <button
                type="button"
                onClick={() => onPauseResume(transaction.recurringId!, false)}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: '#282828',
                  color: 'var(--text-primary)',
                  border: '1px solid #D97706',
                }}
              >
                <Pause width={16} height={16} strokeWidth={1.5} style={{ color: '#D97706' }} />
                <span>Pause</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onPauseResume(transaction.recurringId!, true)}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: '#282828',
                  color: 'var(--text-primary)',
                  border: '1px solid #74C648',
                }}
              >
                <Play width={16} height={16} strokeWidth={1.5} style={{ color: '#74C648' }} />
                <span>Resume</span>
              </button>
            )
          )}
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