'use client';

import { useRef, useState } from 'react';
import { CalendarCheck } from 'iconoir-react';
import { useCloseOnOutsideClick } from '@/hooks/transactions/useCloseOnOutsideClick';
import { FilterOption, FilterTrigger } from './CategoryFilter';

interface MonthFilterProps {
  value: string;
  onChange: (value: string) => void;
  availableMonths: string[];
  formatMonthLabel: (month: string) => string;
}

const PERIOD_OPTIONS = [
  { value: '', label: 'All Time' },
  { value: 'this_month', label: 'This Month' },
  { value: 'this_year', label: 'This Year' },
];

/** Pill dropdown for All Time / This Month / This Year plus specific months seen in the data. */
export default function MonthFilter({ value, onChange, availableMonths, formatMonthLabel }: MonthFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useCloseOnOutsideClick(ref, isOpen, () => setIsOpen(false));

  const period = PERIOD_OPTIONS.find((option) => option.value === value);
  const displayValue = period ? period.label : formatMonthLabel(value);

  const choose = (next: string) => {
    onChange(next);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <FilterTrigger isOpen={isOpen} onToggle={() => setIsOpen((open) => !open)} label={displayValue}>
        <CalendarCheck width={20} height={20} strokeWidth={1.5} aria-hidden="true" />
      </FilterTrigger>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-10 mt-2 overflow-hidden rounded-panel bg-surface-0 shadow-lg">
          <ul role="listbox" aria-label="Period" className="max-h-[200px] overflow-y-auto">
            {PERIOD_OPTIONS.map((option) => (
              <FilterOption
                key={option.value}
                selected={value === option.value}
                onClick={() => choose(option.value)}
                label={option.label}
              />
            ))}
            {availableMonths.length > 0 && (
              <li role="presentation" className="border-t border-line px-4 py-2 text-caption uppercase tracking-wide text-muted">
                Specific Months
              </li>
            )}
            {availableMonths.map((month) => (
              <FilterOption
                key={month}
                selected={value === month}
                onClick={() => choose(month)}
                label={formatMonthLabel(month)}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
