'use client';

import { useRef, useState, type ReactNode } from 'react';
import { NavArrowDown, Filter } from 'iconoir-react';
import type { Category } from '@/types/dashboard';
import { cx } from '@/components/ui/cx';
import { useCloseOnOutsideClick } from '@/hooks/transactions/useCloseOnOutsideClick';
import CategoryIcon, { categoryIconName } from './CategoryIcon';

interface CategoryFilterProps {
  categories: Category[];
  selectedCategory: string | null;
  onSelect: (category: string | null) => void;
}

const UNCATEGORIZED = '__uncategorized__';

/** Pill dropdown for filtering by category, with "All Categories" and "Uncategorized" options. */
export default function CategoryFilter({ categories, selectedCategory, onSelect }: CategoryFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useCloseOnOutsideClick(ref, isOpen, () => setIsOpen(false));

  const selectedCategoryObj = categories.find((category) => category.name === selectedCategory);
  const isUncategorized = selectedCategory === UNCATEGORIZED;
  const displayValue = isUncategorized ? 'Uncategorized' : selectedCategory || 'All Categories';
  const displayIconName = selectedIconName(isUncategorized, selectedCategoryObj);

  const choose = (value: string | null) => {
    onSelect(value);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <FilterTrigger isOpen={isOpen} onToggle={() => setIsOpen((open) => !open)} label={displayValue}>
        {displayIconName ? (
          <CategoryIcon name={displayIconName} width={20} height={20} strokeWidth={1.5} aria-hidden="true" />
        ) : (
          <Filter width={20} height={20} strokeWidth={1.5} aria-hidden="true" />
        )}
      </FilterTrigger>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-10 mt-2 overflow-hidden rounded-panel bg-surface-0 shadow-lg">
          <ul role="listbox" aria-label="Category" className="custom-scrollbar max-h-[300px] overflow-y-auto">
            <FilterOption selected={selectedCategory === null} onClick={() => choose(null)} label="All Categories">
              <Filter width={20} height={20} strokeWidth={1.5} aria-hidden="true" />
            </FilterOption>
            <FilterOption selected={isUncategorized} onClick={() => choose(UNCATEGORIZED)} label="Uncategorized">
              <CategoryIcon name="HelpCircle" width={20} height={20} strokeWidth={1.5} aria-hidden="true" />
            </FilterOption>
            {categories.map((category) => (
              <FilterOption
                key={category.id}
                selected={selectedCategory === category.name}
                onClick={() => choose(category.name)}
                label={category.name}
              >
                <CategoryIcon
                  name={categoryIconName(category.name, category.icon)}
                  width={20}
                  height={20}
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
              </FilterOption>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

interface FilterTriggerProps {
  isOpen: boolean;
  onToggle: () => void;
  label: string;
  /** Leading icon. */
  children: ReactNode;
}

/** Pill button that opens a filter dropdown; turns accent on hover. */
export function FilterTrigger({ isOpen, onToggle, label, children }: FilterTriggerProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-haspopup="listbox"
      aria-expanded={isOpen}
      className="flex w-full items-center justify-between gap-2 rounded-full bg-surface-0 px-4 py-2 text-body text-fg transition-colors hover:text-accent-fg focus-visible:outline-2 focus-visible:outline-accent cursor-pointer"
    >
      <span className="flex items-center gap-2">
        {children}
        <span className="font-semibold">{label}</span>
      </span>
      <NavArrowDown width={16} height={16} strokeWidth={2} aria-hidden="true" />
    </button>
  );
}

interface FilterOptionProps {
  selected: boolean;
  onClick: () => void;
  label: string;
  children?: ReactNode;
}

/** One row in a filter dropdown; the selected row uses the accent color. */
export function FilterOption({ selected, onClick, label, children }: FilterOptionProps) {
  return (
    <li role="option" aria-selected={selected}>
      <button
        type="button"
        onClick={onClick}
        className={cx(
          'flex w-full items-center gap-3 px-4 py-3 text-left text-body transition-colors hover:bg-surface-2 hover:text-accent-fg cursor-pointer',
          selected ? 'text-accent-fg' : 'text-fg',
        )}
      >
        {children}
        <span>{label}</span>
      </button>
    </li>
  );
}

function selectedIconName(isUncategorized: boolean, category: Category | undefined): string | null {
  if (isUncategorized) return 'HelpCircle';
  if (!category) return null;
  return categoryIconName(category.name, category.icon);
}
