'use client';

import { useState, useRef, useEffect, useLayoutEffect, useCallback, CSSProperties } from 'react';
import { NavArrowDown } from 'iconoir-react';
import { createPortal } from 'react-dom';
import { CalendarPanel } from './CalendarPanel';
import { formatDateForDisplay, formatDateToInput } from '@/lib/dateFormatting';

interface ReviewDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function ReviewDatePicker({ value, onChange, disabled = false, placeholder = 'Select date' }: ReviewDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dateInput, setDateInput] = useState(() => formatDateToInput(value));
  const [currentMonth, setCurrentMonth] = useState(() => (value ? new Date(value) : new Date()));
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<CSSProperties | null>(null);
  const [openUpward, setOpenUpward] = useState(false);

  useEffect(() => {
    const inputValue = formatDateToInput(value);
    setDateInput(inputValue);
    setCurrentMonth(inputValue ? new Date(inputValue) : new Date());
  }, [value]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        (!dropdownRef.current || !dropdownRef.current.contains(target))
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const updateDropdownPosition = useCallback(() => {
    if (!isOpen || !triggerRef.current || !dropdownRef.current) return;
    const margin = 8;
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const dropdownRect = dropdownRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - triggerRect.bottom;
    const spaceAbove = triggerRect.top;
    const shouldOpenUp = dropdownRect.height + margin > spaceBelow && spaceAbove > spaceBelow;

    const top = shouldOpenUp
      ? Math.max(margin, triggerRect.top - dropdownRect.height - margin)
      : Math.min(window.innerHeight - dropdownRect.height - margin, triggerRect.bottom + margin);

    const maxLeft = window.innerWidth - dropdownRect.width - margin;
    const left = Math.min(Math.max(triggerRect.left, margin), Math.max(margin, maxLeft));

    setOpenUpward(shouldOpenUp);
    const dropdownWidth = 280;
    setDropdownStyle({
      position: 'fixed',
      width: dropdownWidth,
      left,
      top,
      zIndex: 1000,
    });
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!isOpen) {
      setDropdownStyle(null);
      return;
    }

    updateDropdownPosition();
    window.addEventListener('resize', updateDropdownPosition);
    window.addEventListener('scroll', updateDropdownPosition, true);

    return () => {
      window.removeEventListener('resize', updateDropdownPosition);
      window.removeEventListener('scroll', updateDropdownPosition, true);
    };
  }, [isOpen, updateDropdownPosition]);

  const handleDateSelect = (isoDate: string) => {
    setDateInput(formatDateToInput(isoDate));
    setCurrentMonth(new Date(isoDate));
    onChange(isoDate);
    setIsOpen(false);
  };

  const formattedLabel = value ? formatDateForDisplay(value) : placeholder;

  return (
    <div ref={containerRef} className="w-full min-w-0">
      <button
        type="button"
        ref={triggerRef}
        onClick={() => !disabled && setIsOpen(prev => !prev)}
        disabled={disabled}
        className="w-full min-w-0 px-0 py-0 rounded-lg text-body bg-transparent border-none flex items-center justify-between gap-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
        style={{ color: value ? 'var(--text-primary)' : 'var(--text-secondary)' }}
      >
        <span className="truncate">{formattedLabel}</span>
        <NavArrowDown width={16} height={16} strokeWidth={2} className="shrink-0" style={{ color: '#B9B9B9' }} />
      </button>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          className="rounded-2xl shadow-lg border border-[#3a3a3a] overflow-hidden w-[280px] max-w-[min(280px,100vw)]"
          style={{
            backgroundColor: '#202020',
            ...(dropdownStyle ?? {
              position: 'fixed',
              top: -9999,
              left: -9999,
              zIndex: 1000,
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
  );
}

