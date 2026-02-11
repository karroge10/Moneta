'use client';

import { useState, useEffect, useRef, useLayoutEffect, useCallback, CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { NavArrowDown, Trash } from 'iconoir-react';
import { Goal } from '@/types/dashboard';
import { useCurrency } from '@/hooks/useCurrency';
import Spinner from '@/components/ui/Spinner';
import CurrencySelector from '@/components/transactions/import/CurrencySelector';
import { CalendarPanel } from '@/components/transactions/shared/CalendarPanel';
import { formatDateForDisplay, formatDateToInput } from '@/lib/dateFormatting';
import type { CurrencyOption } from '@/lib/currency-country-map';

import ConfirmModal from '@/components/ui/ConfirmModal';

interface GoalFormProps {
  goal: Goal;
  mode: 'add' | 'edit';
  currencyOptions: CurrencyOption[];
  onSave: (goal: Goal) => void;
  onCancel: () => void;
  onDelete?: () => void;
  onFloatingPanelToggle?: (isOpen: boolean) => void;
  isSaving?: boolean;
}

export default function GoalForm({
  goal,
  mode,
  currencyOptions,
  onSave,
  onCancel,
  onDelete,
  onFloatingPanelToggle,
  isSaving = false,
}: GoalFormProps) {
  const { currency: userCurrency } = useCurrency();
  const [formData, setFormData] = useState<Goal>(goal);
  const displayCurrency = formData.currencyId != null
    ? (currencyOptions.find((c) => c.id === formData.currencyId) ?? userCurrency)
    : userCurrency;
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [dateInput, setDateInput] = useState('');
  const dateDropdownRef = useRef<HTMLDivElement>(null);
  const dateTriggerRef = useRef<HTMLButtonElement>(null);
  const datePortalRef = useRef<HTMLDivElement>(null);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const initial = formatDateToInput(goal.targetDate);
    return initial ? new Date(initial) : new Date();
  });
  
  // Portal positioning state for date dropdown
  const [dateDropdownStyle, setDateDropdownStyle] = useState<CSSProperties | null>(null);
  const [dateOpenUpward, setDateOpenUpward] = useState(false);
  
  const [targetAmountInput, setTargetAmountInput] = useState(goal.targetAmount.toString());
  const [currentAmountInput, setCurrentAmountInput] = useState(goal.currentAmount.toString());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    // Sync goal prop to form state
    setFormData(goal);
    setTargetAmountInput(goal.targetAmount.toString());
    setCurrentAmountInput(goal.currentAmount.toString());
    const initial = formatDateToInput(goal.targetDate);
    setDateInput(initial);
    setCurrentMonth(initial ? new Date(initial) : new Date());
  }, [goal]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      // Date dropdown (portal) - check both container and portal ref
      if (isDateOpen && 
          dateDropdownRef.current && 
          !dateDropdownRef.current.contains(target) &&
          (!datePortalRef.current || !datePortalRef.current.contains(target))) {
        setIsDateOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDateOpen]);

  useEffect(() => {
    onFloatingPanelToggle?.(isDateOpen);
  }, [isDateOpen, onFloatingPanelToggle]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate fields
    if (!formData.name.trim()) {
      alert('Please enter a goal name');
      return;
    }
    
    if (!formData.targetDate) {
      alert('Please select a target date');
      return;
    }
    
    const targetAmount = parseFloat(targetAmountInput.replace(/,/g, '.'));
    const currentAmount = parseFloat(currentAmountInput.replace(/,/g, '.'));
    
    if (isNaN(targetAmount) || targetAmount <= 0) {
      alert('Target amount must be greater than 0');
      return;
    }
    
    if (isNaN(currentAmount) || currentAmount < 0) {
      alert('Current amount cannot be negative');
      return;
    }
    
    onSave({
      ...formData,
      targetAmount,
      currentAmount,
      currencyId: formData.currencyId ?? undefined,
    });
  };

  const handleDelete = async () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = () => {
    if (onDelete) {
      onDelete();
    }
    setShowDeleteConfirm(false);
  };

  const handleDateSelect = (value: string) => {
    setDateInput(value);
    setFormData(prev => ({
      ...prev,
      targetDate: formatDateForDisplay(value),
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
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-body font-medium mb-2">Goal Name</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          disabled={isSaving}
          className="w-full px-4 py-2 rounded-xl bg-[#202020] text-body border border-[#3a3a3a] focus:border-[#AC66DA] focus:outline-none transition-colors placeholder:text-[#8C8C8C] disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ color: 'var(--text-primary)' }}
          placeholder="Enter goal name"
          required
        />
      </div>

      <div>
        <label className="block text-body font-medium mb-2">Target Date</label>
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
              style={{ color: formData.targetDate ? 'var(--text-primary)' : '#8C8C8C' }}
            >
              {formData.targetDate ? formData.targetDate : 'Select a date'}
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
        <CurrencySelector
          options={currencyOptions}
          selectedCurrencyId={formData.currencyId ?? null}
          onSelect={handleCurrencySelect}
          disabled={isSaving}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-body font-medium mb-2">Target Amount</label>
          <div className="relative">
            <span 
              className="absolute left-4 top-1/2 -translate-y-1/2 text-body font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              {displayCurrency.symbol}
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={targetAmountInput}
              onChange={(e) => {
                const sanitized = e.target.value.replace(/[^0-9.,]/g, '');
                setTargetAmountInput(sanitized);
                const numericValue = parseFloat(sanitized.replace(/,/g, '.'));
                if (!isNaN(numericValue)) {
                  setFormData(prev => ({
                    ...prev,
                    targetAmount: numericValue,
                  }));
                }
              }}
              disabled={isSaving}
              className="w-full pl-8 pr-4 py-2 rounded-xl bg-[#202020] text-body border border-[#3a3a3a] focus:border-[#AC66DA] focus:outline-none transition-colors placeholder:text-[#8C8C8C] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ color: 'var(--text-primary)' }}
              placeholder="0.00"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-body font-medium mb-2">Current Amount</label>
          <div className="relative">
            <span 
              className="absolute left-4 top-1/2 -translate-y-1/2 text-body font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              {displayCurrency.symbol}
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={currentAmountInput}
              onChange={(e) => {
                const sanitized = e.target.value.replace(/[^0-9.,]/g, '');
                setCurrentAmountInput(sanitized);
                const numericValue = parseFloat(sanitized.replace(/,/g, '.'));
                if (!isNaN(numericValue)) {
                  setFormData(prev => ({
                    ...prev,
                    currentAmount: numericValue,
                  }));
                }
              }}
              disabled={isSaving}
              className="w-full pl-8 pr-4 py-2 rounded-xl bg-[#202020] text-body border border-[#3a3a3a] focus:border-[#AC66DA] focus:outline-none transition-colors placeholder:text-[#8C8C8C] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ color: 'var(--text-primary)' }}
              placeholder="0.00"
              required
            />
          </div>
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
            style={{ backgroundColor: 'var(--accent-purple)', color: '#E7E4E4' }}
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
            {isSaving && <Spinner size={16} color="var(--text-primary)" />}
            <span>{mode === 'add' ? 'Add Goal' : 'Save Changes'}</span>
          </button>
        </div>
      </div>
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Delete Goal"
        message={
          <>
            Are you sure you want to delete your goal <span className="font-bold text-[#E7E4E4]">{formData.name || 'this goal'}</span>?
            <br /><br />
            This will permanently remove the goal and all tracked progress. This action cannot be undone.
          </>
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowDeleteConfirm(false)}
        isLoading={isSaving}
        variant="danger"
      />
    </form>
  );
}

