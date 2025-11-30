'use client';

import { useState, useRef, useEffect } from 'react';
import { NavArrowDown, Filter } from 'iconoir-react';
import { Category } from '@/types/dashboard';
import { getIcon } from '@/lib/iconMapping';

interface CategoryFilterProps {
  categories: Category[];
  selectedCategory: string | null;
  onSelect: (category: string | null) => void;
}

export default function CategoryFilter({ categories, selectedCategory, onSelect }: CategoryFilterProps) {
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
  const isUncategorized = selectedCategory === '__uncategorized__';
  const displayValue = isUncategorized ? 'Uncategorized' : (selectedCategory || 'All Categories');
  const textColor = isHovered ? '#AC66DA' : '#E7E4E4';

  const resolveIcon = (categoryName?: string | null, iconKey?: string) => {
    if (!categoryName) return getIcon('HelpCircle');
    if (categoryName.toLowerCase() === 'other') return getIcon('ViewGrid');
    return iconKey ? getIcon(iconKey) : getIcon('HelpCircle');
  };

  const DisplayIcon = (() => {
    if (isUncategorized) return getIcon('HelpCircle');
    if (selectedCategoryObj) return resolveIcon(selectedCategoryObj.name, selectedCategoryObj.icon);
    return null;
  })();

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="flex items-center gap-2 px-4 py-2 rounded-full transition-colors duration-150 cursor-pointer w-full justify-between text-body"
        style={{ backgroundColor: '#202020', color: textColor, transitionProperty: 'color' }}
      >
        <div className="flex items-center gap-2">
          {DisplayIcon ? (
            <DisplayIcon width={20} height={20} strokeWidth={1.5} style={{ color: textColor, transition: 'color 150ms ease-in-out' }} />
          ) : (
            <Filter width={20} height={20} strokeWidth={1.5} style={{ color: textColor, transition: 'color 150ms ease-in-out' }} />
          )}
          <span className="font-semibold" style={{ transition: 'color 150ms ease-in-out' }}>{displayValue}</span>
        </div>
        <NavArrowDown width={16} height={16} strokeWidth={2} style={{ color: textColor, transition: 'color 150ms ease-in-out' }} />
      </button>
      
      {isOpen && (
        <div className="absolute top-full mt-2 left-0 right-0 rounded-2xl shadow-lg overflow-hidden z-10" style={{ backgroundColor: '#202020' }}>
          <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
            <button
              onClick={() => {
                onSelect(null);
                setIsOpen(false);
              }}
              className="w-full text-left px-4 py-3 flex items-center gap-3 hover-text-purple transition-colors text-body cursor-pointer group"
              style={{ 
                backgroundColor: 'transparent',
                color: selectedCategory === null ? 'var(--accent-purple)' : 'var(--text-primary)' 
              }}
            >
              <Filter width={20} height={20} strokeWidth={1.5} />
              <span>All Categories</span>
            </button>
            <button
              onClick={() => {
                onSelect('__uncategorized__');
                setIsOpen(false);
              }}
              className="w-full text-left px-4 py-3 flex items-center gap-3 hover-text-purple transition-colors text-body cursor-pointer group"
              style={{ 
                backgroundColor: 'transparent',
                color: isUncategorized ? 'var(--accent-purple)' : 'var(--text-primary)' 
              }}
            >
              {(() => {
                const Icon = getIcon('HelpCircle');
                return <Icon width={20} height={20} strokeWidth={1.5} />;
              })()}
              <span>Uncategorized</span>
            </button>
            {categories.map((category) => {
              const Icon = resolveIcon(category.name, category.icon);
              const isSelected = selectedCategory === category.name;
              return (
                <button
                  key={category.id}
                  onClick={() => {
                    onSelect(category.name);
                    setIsOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 flex items-center gap-3 hover-text-purple transition-colors text-body cursor-pointer group"
                  style={{ 
                    backgroundColor: 'transparent',
                    color: isSelected ? 'var(--accent-purple)' : 'var(--text-primary)' 
                  }}
                >
                  <Icon 
                    width={20} 
                    height={20} 
                    strokeWidth={1.5} 
                    style={{ 
                      color: 'currentColor'
                    }}
                  />
                  <span>{category.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}


