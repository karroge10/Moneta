'use client';

import { useRef, useState } from 'react';
import { NavArrowDown } from 'iconoir-react';
import { cx } from '@/components/ui/cx';
import { formatDateForDisplay, formatDateToInput } from '@/lib/dateFormatting';
import CalendarPopover from './CalendarPopover';

interface ReviewDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

/** Borderless date trigger for table cells and settings rows; opens a calendar popover. */
export default function ReviewDatePicker({ value, onChange, disabled = false, placeholder = 'Select date' }: ReviewDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const label = value ? formatDateForDisplay(value) : placeholder;
  const inputValue = formatDateToInput(value);

  const handleSelect = (isoDate: string) => {
    onChange(isoDate);
    setIsOpen(false);
  };

  return (
    <div className="w-full min-w-0">
      <button
        type="button"
        ref={triggerRef}
        onClick={() => setIsOpen((open) => !open)}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className={cx(
          'flex w-full min-w-0 items-center justify-between gap-2 rounded-chip text-body transition-colors cursor-pointer',
          'disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-accent',
          value ? 'text-fg' : 'text-secondary',
        )}
      >
        <span className="truncate tabular-nums">{label}</span>
        <NavArrowDown width={16} height={16} strokeWidth={2} className="shrink-0 text-secondary" aria-hidden="true" />
      </button>

      {isOpen && (
        <CalendarPopover
          anchorRef={triggerRef}
          value={inputValue}
          onSelect={handleSelect}
          onClose={() => setIsOpen(false)}
          width={280}
        />
      )}
    </div>
  );
}
