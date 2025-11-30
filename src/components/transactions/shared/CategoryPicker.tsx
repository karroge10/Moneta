'use client';

import { useState, useRef, useEffect, useLayoutEffect, useCallback, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { NavArrowDown } from 'iconoir-react';
import { Category } from '@/types/dashboard';
import { getIcon } from '@/lib/iconMapping';

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
  const [dropdownStyle, setDropdownStyle] = useState<CSSProperties | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        ref.current &&
        !ref.current.contains(target) &&
        (!dropdownRef.current || !dropdownRef.current.contains(target))
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const updateDropdownPosition = useCallback(() => {
    if (!isOpen) return;
    if (!triggerRef.current || !dropdownRef.current) return;

    const margin = 8;
    const viewportWidth = window.innerWidth;
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const dropdownRect = dropdownRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - triggerRect.bottom;
    const spaceAbove = triggerRect.top;
    const shouldOpenUp = dropdownRect.height + margin > spaceBelow && spaceAbove > spaceBelow;

    const top = shouldOpenUp
      ? Math.max(margin, triggerRect.top - dropdownRect.height - margin)
      : Math.min(window.innerHeight - dropdownRect.height - margin, triggerRect.bottom + margin);

    const maxLeft = viewportWidth - triggerRect.width - margin;
    const left = Math.min(Math.max(triggerRect.left, margin), Math.max(margin, maxLeft));

    setOpenUpward(shouldOpenUp);
    setDropdownStyle({
      position: 'fixed',
      width: triggerRect.width,
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

  const selectedCategoryObj = categories.find(cat => cat.name === selectedCategory);
  const displayValue = selectedCategory || 'Uncategorized';

  const resolveIcon = (categoryName?: string | null, iconKey?: string) => {
    if (!categoryName) {
      return getIcon('HelpCircle');
    }
    if (categoryName.toLowerCase() === 'other') {
      return getIcon('ViewGrid');
    }
    return iconKey ? getIcon(iconKey) : getIcon('HelpCircle');
  };

  const DisplayIcon = resolveIcon(selectedCategory, selectedCategoryObj?.icon);
  const UnassignedIcon = getIcon('HelpCircle');
  const menuStyle: CSSProperties = dropdownStyle ?? {
    position: 'fixed',
    top: -9999,
    left: -9999,
    zIndex: 1000,
    width: triggerRef.current?.getBoundingClientRect().width,
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        ref={triggerRef}
        onClick={() => setIsOpen(prev => !prev)}
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
      
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          className={`rounded-xl shadow-lg overflow-hidden border border-[#3a3a3a] ${openUpward ? 'origin-bottom' : 'origin-top'}`}
          style={{ backgroundColor: '#282828', ...menuStyle }}
        >
          <div className="max-h-[240px] overflow-y-auto custom-scrollbar">
            <button
              type="button"
              onClick={() => {
                onSelect(null);
                setIsOpen(false);
              }}
              className="w-full text-left px-4 py-3 flex items-center gap-3 transition-colors text-body cursor-pointer hover:bg-[#2F2F2F]"
              style={{ color: selectedCategory === null ? 'var(--accent-purple)' : 'var(--text-primary)' }}
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
                  className="w-full text-left px-4 py-3 flex items-center gap-3 transition-colors text-body cursor-pointer hover:bg-[#2F2F2F]"
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
        </div>,
        document.body,
      )}
      
      {suggestedCategory && !selectedCategory && (
        <div className="mt-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <span>Suggested: {suggestedCategory}</span>
        </div>
      )}
    </div>
  );
}

