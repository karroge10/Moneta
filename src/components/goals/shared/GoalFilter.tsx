'use client';

import { useState, useRef, useEffect } from 'react';
import { NavArrowDown, Filter, CheckCircle, Clock, Xmark } from 'iconoir-react';
import { GoalStatus } from '@/lib/goalUtils';
import { cx } from '@/components/ui/cx';

interface GoalFilterProps {
  selectedStatus: GoalStatus | 'all' | null;
  onSelect: (status: GoalStatus | 'all' | null) => void;
}

const statusOptions: Array<{ value: GoalStatus | 'all'; label: string; icon: typeof CheckCircle }> = [
  { value: 'all', label: 'All Goals', icon: Filter },
  { value: 'active', label: 'Active', icon: Clock },
  { value: 'completed', label: 'Completed', icon: CheckCircle },
  { value: 'failed', label: 'Failed', icon: Xmark },
];

/** Status filter dropdown for the goals list. */
export default function GoalFilter({ selectedStatus, onSelect }: GoalFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setIsOpen(false);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const selectedOption = statusOptions.find((option) => option.value === selectedStatus) || statusOptions[0];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="flex min-h-10 w-full items-center justify-between gap-2 rounded-full bg-surface-0 px-4 py-2 text-fg transition-colors hover:text-accent-fg"
      >
        <span className="flex items-center gap-2">
          <Filter width={18} height={18} strokeWidth={1.5} aria-hidden="true" />
          <span className="whitespace-nowrap text-ui font-semibold">{selectedOption.label}</span>
        </span>
        <NavArrowDown width={16} height={16} strokeWidth={2} aria-hidden="true" />
      </button>

      {isOpen && (
        <ul role="listbox" aria-label="Goal status" className="absolute left-0 right-0 top-full z-10 mt-2 overflow-hidden rounded-panel bg-surface-0 shadow-lg">
          {statusOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = selectedStatus === option.value;
            return (
              <li key={option.value} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(option.value);
                    setIsOpen(false);
                  }}
                  className={cx(
                    'flex w-full items-center gap-3 px-4 py-3 text-left text-body transition-colors hover:text-accent-fg',
                    isSelected ? 'text-accent-fg' : 'text-fg',
                  )}
                >
                  <Icon width={20} height={20} strokeWidth={1.5} aria-hidden="true" />
                  <span>{option.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
