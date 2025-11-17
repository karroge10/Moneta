'use client';

import { useState, useRef, useEffect } from 'react';
import { NavArrowDown, ShoppingBag, Wallet, LotOfCash } from 'iconoir-react';

interface TypeFilterProps {
  value: string;
  onChange: (value: string) => void;
}

export default function TypeFilter({ value, onChange }: TypeFilterProps) {
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

  const displayValue = value === 'expense' ? 'Expenses' : value === 'income' ? 'Income' : 'All types';
  const textColor = isHovered ? '#AC66DA' : '#E7E4E4';

  // Get icon for selected value
  const getSelectedIcon = () => {
    if (value === 'expense') return ShoppingBag;
    if (value === 'income') return Wallet;
    return LotOfCash;
  };
  const SelectedIcon = getSelectedIcon();

  const options = [
    { value: '', label: 'All types', icon: LotOfCash },
    { value: 'expense', label: 'Expenses', icon: ShoppingBag },
    { value: 'income', label: 'Income', icon: Wallet },
  ];

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
          <SelectedIcon width={20} height={20} strokeWidth={1.5} style={{ color: textColor, transition: 'color 150ms ease-in-out' }} />
          <span className="font-semibold" style={{ transition: 'color 150ms ease-in-out' }}>{displayValue}</span>
        </div>
        <NavArrowDown width={16} height={16} strokeWidth={2} style={{ color: textColor, transition: 'color 150ms ease-in-out' }} />
      </button>
      
      {isOpen && (
        <div className="absolute top-full mt-2 left-0 right-0 rounded-2xl shadow-lg overflow-hidden z-10" style={{ backgroundColor: '#202020' }}>
          {options.map((option) => {
            const isSelected = value === option.value;
            const OptionIcon = option.icon;
            return (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className="w-full text-left px-4 py-3 flex items-center gap-3 hover-text-purple transition-colors text-body cursor-pointer group"
                style={{ 
                  backgroundColor: 'transparent',
                  color: isSelected ? 'var(--accent-purple)' : 'var(--text-primary)' 
                }}
              >
                <OptionIcon 
                  width={20} 
                  height={20} 
                  strokeWidth={1.5} 
                  className="transition-colors duration-150"
                  style={{ 
                    color: 'currentColor'
                  }}
                />
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

