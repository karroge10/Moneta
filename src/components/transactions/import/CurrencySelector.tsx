'use client';

import { useState, useRef, useEffect } from 'react';
import { NavArrowDown } from 'iconoir-react';

type CurrencyOption = {
  id: number;
  name: string;
  symbol: string;
  alias: string;
};

interface CurrencySelectorProps {
  options: CurrencyOption[];
  selectedCurrencyId: number | null;
  onSelect: (currencyId: number | null) => void;
  disabled?: boolean;
}

export default function CurrencySelector({ 
  options, 
  selectedCurrencyId, 
  onSelect, 
  disabled = false 
}: CurrencySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [openUpward, setOpenUpward] = useState(true); // Default to opening upward
  const ref = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedCurrency = options.find(opt => opt.id === selectedCurrencyId);
  const displayValue = selectedCurrency 
    ? `${selectedCurrency.symbol} ${selectedCurrency.name} (${selectedCurrency.alias})`
    : 'Select currency';
  const textColor = isHovered ? '#AC66DA' : '#E7E4E4';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      const dropdownHeight = 256; // max-h-64 = 256px
      
      // Always prefer opening upward for currency selector (it's at the bottom of the page)
      // But check if there's enough space above, otherwise open downward
      const shouldOpenUpward = spaceAbove > dropdownHeight || spaceAbove > spaceBelow;
      setOpenUpward(shouldOpenUpward);
    }
  }, [isOpen]);

  return (
    <div className="relative w-full sm:w-auto" ref={ref}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onMouseEnter={() => !disabled && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        disabled={disabled}
        className="flex items-center gap-2 px-4 py-2.5 rounded-full transition-colors duration-150 cursor-pointer justify-between text-body font-semibold w-full sm:min-w-[320px] disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
        style={{ 
          backgroundColor: '#202020', 
          color: disabled ? 'rgba(231, 228, 228, 0.6)' : textColor, 
          transitionProperty: 'color', 
          border: '1px solid #3a3a3a' 
        }}
      >
        <span className="font-semibold whitespace-nowrap" style={{ transition: 'color 150ms ease-in-out' }}>
          {displayValue}
        </span>
        <NavArrowDown 
          width={16} 
          height={16} 
          strokeWidth={2} 
          style={{ 
            color: disabled ? 'rgba(231, 228, 228, 0.6)' : textColor, 
            transition: 'color 150ms ease-in-out',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transitionProperty: 'transform, color'
          }} 
        />
      </button>
      
      {isOpen && (
        <div 
          ref={dropdownRef}
          className={`absolute left-0 right-0 rounded-2xl shadow-lg overflow-hidden z-50 border border-[#3a3a3a] ${openUpward ? 'bottom-full mb-2' : 'top-full mt-2'}`}
          style={{ backgroundColor: '#202020' }}
        >
          <div className="max-h-64 overflow-y-auto custom-scrollbar">
            <button
              type="button"
              onClick={() => {
                onSelect(null);
                setIsOpen(false);
              }}
              className="w-full text-left px-4 py-3 flex items-center gap-3 hover-text-purple transition-colors text-body cursor-pointer"
              style={{ 
                backgroundColor: 'transparent',
                color: selectedCurrencyId === null ? 'var(--accent-purple)' : 'var(--text-primary)' 
              }}
            >
              <span>Select currency</span>
            </button>
            {options.map((option) => {
              const isSelected = selectedCurrencyId === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    onSelect(option.id);
                    setIsOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 flex items-center gap-3 hover-text-purple transition-colors text-body cursor-pointer"
                  style={{ 
                    backgroundColor: 'transparent',
                    color: isSelected ? 'var(--accent-purple)' : 'var(--text-primary)' 
                  }}
                >
                  <span className="font-semibold min-w-[24px]">{option.symbol}</span>
                  <span>{option.name} ({option.alias})</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

