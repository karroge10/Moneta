'use client';

import { useRef, useState } from 'react';
import { NavArrowDown } from 'iconoir-react';
import type { Category } from '@/types/dashboard';
import { cx } from '@/components/ui/cx';
import { useCloseOnOutsideClick } from '@/hooks/transactions/useCloseOnOutsideClick';
import CategoryIcon, { categoryIconName } from './CategoryIcon';

const DROPDOWN_MAX_HEIGHT = 240;
const MARGIN = 8;

interface CategoryPickerProps {
  categories: Category[];
  selectedCategory: string | null;
  onSelect: (category: string | null) => void;
  suggestedCategory?: string | null;
}

/** Compact category select for review table cells; opens upward near the bottom of the viewport. */
export default function CategoryPicker({ categories, selectedCategory, onSelect, suggestedCategory }: CategoryPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useCloseOnOutsideClick(ref, isOpen, () => setIsOpen(false));

  const selectedCategoryObj = categories.find((category) => category.name === selectedCategory);
  const displayIconName = categoryIconName(selectedCategory, selectedCategoryObj?.icon);

  const toggle = () => {
    if (!isOpen && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUpward(spaceBelow < DROPDOWN_MAX_HEIGHT + MARGIN && rect.top > spaceBelow);
    }
    setIsOpen((open) => !open);
  };

  const choose = (value: string | null) => {
    onSelect(value);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={cx(
          'flex w-full items-center justify-between gap-2 rounded-control border border-line bg-surface-1 px-3 py-2 text-ui font-semibold transition-colors cursor-pointer',
          'focus-visible:outline-2 focus-visible:outline-accent',
          selectedCategory ? 'text-fg' : 'text-secondary',
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          <CategoryIcon name={displayIconName} width={20} height={20} strokeWidth={1.5} className="shrink-0 text-fg" aria-hidden="true" />
          <span className="truncate">{selectedCategory || 'Uncategorized'}</span>
        </span>
        <NavArrowDown width={16} height={16} strokeWidth={2} className="shrink-0 text-secondary" aria-hidden="true" />
      </button>

      {isOpen && (
        <ul
          role="listbox"
          aria-label="Category"
          className={cx(
            'custom-scrollbar absolute left-0 right-0 z-50 max-h-[240px] overflow-y-auto rounded-control border border-line bg-surface-1 shadow-lg',
            openUpward ? 'bottom-full mb-2' : 'top-full mt-2',
          )}
        >
          <PickerOption selected={selectedCategory === null} onClick={() => choose(null)} label="Uncategorized" iconName="HelpCircle" />
          {categories.map((category) => (
            <PickerOption
              key={category.id}
              selected={selectedCategory === category.name}
              onClick={() => choose(category.name)}
              label={category.name}
              iconName={categoryIconName(category.name, category.icon)}
            />
          ))}
        </ul>
      )}

      {suggestedCategory && !selectedCategory && (
        <p className="mt-1.5 text-caption text-secondary">Suggested: {suggestedCategory}</p>
      )}
    </div>
  );
}

interface PickerOptionProps {
  selected: boolean;
  onClick: () => void;
  label: string;
  iconName: string;
}

function PickerOption({ selected, onClick, label, iconName }: PickerOptionProps) {
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
        <CategoryIcon name={iconName} width={20} height={20} strokeWidth={1.5} aria-hidden="true" />
        <span className="font-medium">{label}</span>
      </button>
    </li>
  );
}
