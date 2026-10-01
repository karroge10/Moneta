'use client';

import { useRef, useState } from 'react';
import { ShoppingBag, Wallet, LotOfCash } from 'iconoir-react';
import { useCloseOnOutsideClick } from '@/hooks/transactions/useCloseOnOutsideClick';
import { FilterOption, FilterTrigger } from './CategoryFilter';

interface TypeFilterProps {
  value: string;
  onChange: (value: string) => void;
}

const OPTIONS = [
  { value: '', label: 'All types', icon: LotOfCash },
  { value: 'expense', label: 'Expenses', icon: ShoppingBag },
  { value: 'income', label: 'Income', icon: Wallet },
];

/** Pill dropdown for All / Expenses / Income. */
export default function TypeFilter({ value, onChange }: TypeFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useCloseOnOutsideClick(ref, isOpen, () => setIsOpen(false));

  const selected = OPTIONS.find((option) => option.value === value) ?? OPTIONS[0];
  const SelectedIcon = selected.icon;

  const choose = (next: string) => {
    onChange(next);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <FilterTrigger isOpen={isOpen} onToggle={() => setIsOpen((open) => !open)} label={selected.label}>
        <SelectedIcon width={20} height={20} strokeWidth={1.5} aria-hidden="true" />
      </FilterTrigger>

      {isOpen && (
        <ul
          role="listbox"
          aria-label="Type"
          className="absolute left-0 right-0 top-full z-10 mt-2 overflow-hidden rounded-panel bg-surface-0 shadow-lg"
        >
          {OPTIONS.map((option) => {
            const OptionIcon = option.icon;
            return (
              <FilterOption
                key={option.value}
                selected={value === option.value}
                onClick={() => choose(option.value)}
                label={option.label}
              >
                <OptionIcon width={20} height={20} strokeWidth={1.5} aria-hidden="true" />
              </FilterOption>
            );
          })}
        </ul>
      )}
    </div>
  );
}
