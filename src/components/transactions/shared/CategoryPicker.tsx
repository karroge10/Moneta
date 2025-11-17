'use client';

import { useState, useRef, useEffect } from 'react';
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
  const [isHovered, setIsHovered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedCategoryObj = categories.find(cat => cat.name === selectedCategory);
  const displayValue = selectedCategory || 'Uncategorized';
  const textColor = isHovered ? '#AC66DA' : '#E7E4E4';
  const DisplayIcon = selectedCategoryObj ? getIcon(selectedCategoryObj.icon) : null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="flex items-center gap-2 px-3 py-2 rounded-full transition-colors duration-150 cursor-pointer w-full justify-between text-sm"
        style={{ backgroundColor: '#202020', color: textColor, transitionProperty: 'color', border: '1px solid #3a3a3a' }}
      >
        <div className="flex items-center gap-2">
          {DisplayIcon ? (
            <DisplayIcon width={20} height={20} strokeWidth={1.5} style={{ color: textColor, transition: 'color 150ms ease-in-out' }} />
          ) : null}
          <span className="font-semibold" style={{ transition: 'color 150ms ease-in-out' }}>{displayValue}</span>
        </div>
        <NavArrowDown width={16} height={16} strokeWidth={2} style={{ color: textColor, transition: 'color 150ms ease-in-out' }} />
      </button>
      
      {isOpen && (
        <div className="absolute top-full mt-2 left-0 right-0 rounded-2xl shadow-lg overflow-hidden z-10" style={{ backgroundColor: '#202020' }}>
          <div className="max-h-[240px] overflow-y-auto custom-scrollbar">
            <button
              type="button"
              onClick={() => {
                onSelect(null);
                setIsOpen(false);
              }}
              className="w-full text-left px-4 py-3 flex items-center gap-3 hover-text-purple transition-colors text-body cursor-pointer"
              style={{ 
                backgroundColor: 'transparent',
                color: selectedCategory === null ? 'var(--accent-purple)' : 'var(--text-primary)' 
              }}
            >
              <span>Uncategorized</span>
            </button>
            {categories.map((category) => {
              const Icon = getIcon(category.icon);
              const isSelected = selectedCategory === category.name;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => {
                    onSelect(category.name);
                    setIsOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 flex items-center gap-3 hover-text-purple transition-colors text-body cursor-pointer"
                  style={{ 
                    backgroundColor: 'transparent',
                    color: isSelected ? 'var(--accent-purple)' : 'var(--text-primary)' 
                  }}
                >
                  <Icon width={20} height={20} strokeWidth={1.5} style={{ color: isSelected ? 'var(--accent-purple)' : 'var(--text-primary)' }} />
                  <span>{category.name}</span>
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

