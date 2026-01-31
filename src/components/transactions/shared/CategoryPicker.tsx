'use client';

import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { NavArrowDown } from 'iconoir-react';
import { Category } from '@/types/dashboard';
import { getIcon } from '@/lib/iconMapping';

const DROPDOWN_MAX_HEIGHT = 240;
const MARGIN = 8;

interface CategoryPickerProps {
  categories: Category[];
  selectedCategory: string | null;
  onSelect: (category: string | null) => void;
  suggestedCategory?: string | null;
}

export default function CategoryPicker({ categories, selectedCategory, onSelect, suggestedCategory }: CategoryPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (ref.current && !ref.current.contains(target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const updatePosition = useCallback(() => {
    if (!isOpen || !triggerRef.current || !dropdownRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - triggerRect.bottom;
    const spaceAbove = triggerRect.top;

    const shouldOpenUp =
      spaceBelow < DROPDOWN_MAX_HEIGHT + MARGIN && spaceAbove > spaceBelow;
    setOpenUpward(shouldOpenUp);
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!isOpen) return;

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, updatePosition]);

  const selectedCategoryObj = categories.find((cat) => cat.name === selectedCategory);
  const displayValue = selectedCategory || 'Uncategorized';

  const resolveIcon = (categoryName?: string | null, iconKey?: string) => {
    if (!categoryName) return getIcon('HelpCircle');
    if (categoryName.toLowerCase() === 'other') return getIcon('ViewGrid');
    return iconKey ? getIcon(iconKey) : getIcon('HelpCircle');
  };

  const DisplayIcon = resolveIcon(selectedCategory, selectedCategoryObj?.icon);
  const UnassignedIcon = getIcon('HelpCircle');

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        ref={triggerRef}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-sm font-semibold transition-colors cursor-pointer w-full bg-[#282828] border-[#3a3a3a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AC66DA]/60"
        style={{ color: selectedCategory ? 'var(--text-primary)' : 'var(--text-secondary)' }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {DisplayIcon && (
            <DisplayIcon
              width={20}
              height={20}
              strokeWidth={1.5}
              style={{ color: 'var(--text-primary)' }}
            />
          )}
          <span className="truncate">{displayValue}</span>
        </div>
        <NavArrowDown width={16} height={16} strokeWidth={2} style={{ color: 'var(--text-secondary)' }} />
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className={`absolute left-0 right-0 rounded-xl shadow-lg overflow-hidden border border-[#3a3a3a] z-50 ${
            openUpward ? 'bottom-full mb-2' : 'top-full mt-2'
          }`}
          style={{ backgroundColor: '#282828' }}
        >
          <div className="max-h-[240px] overflow-y-auto custom-scrollbar">
            <button
              type="button"
              onClick={() => {
                onSelect(null);
                setIsOpen(false);
              }}
              className="w-full text-left px-4 py-3 flex items-center gap-3 transition-colors text-body cursor-pointer hover:bg-[#2F2F2F] hover-text-purple"
              style={{
                color: selectedCategory === null ? 'var(--accent-purple)' : 'var(--text-primary)',
              }}
            >
              <UnassignedIcon
                width={20}
                height={20}
                strokeWidth={1.5}
                style={{ color: selectedCategory === null ? 'var(--accent-purple)' : 'var(--text-primary)' }}
              />
              <span className="font-medium">Uncategorized</span>
            </button>
            {categories.map((category) => {
              const Icon = resolveIcon(category.name, category.icon);
              const isSelected = selectedCategory === category.name;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => {
                    onSelect(category.name);
                    setIsOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 flex items-center gap-3 transition-colors text-body cursor-pointer hover:bg-[#2F2F2F] hover-text-purple"
                  style={{ color: isSelected ? 'var(--accent-purple)' : 'var(--text-primary)' }}
                >
                  <Icon
                    width={20}
                    height={20}
                    strokeWidth={1.5}
                    style={{ color: isSelected ? 'var(--accent-purple)' : 'var(--text-primary)' }}
                  />
                  <span className="font-medium">{category.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {suggestedCategory && !selectedCategory && (
        <div className="mt-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <span>Suggested: {suggestedCategory}</span>
        </div>
      )}
    </div>
  );
}
