'use client';

import { useState, useRef, useEffect } from 'react';
import { NavArrowDown, CalendarCheck } from 'iconoir-react';

interface MonthFilterProps {
  value: string;
  onChange: (value: string) => void;
  availableMonths: string[];
  formatMonthLabel: (month: string) => string;
}

export default function MonthFilter({ value, onChange, availableMonths, formatMonthLabel }: MonthFilterProps) {
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

  // Determine display value
  let displayValue = 'All Time';
  if (value) {
    // Check if it's a time period or a month
    if (value === 'this_month' || value === 'this_year') {
      const periodMap: Record<string, string> = {
        'this_month': 'This Month',
        'this_year': 'This Year',
      };
      displayValue = periodMap[value] || 'All Time';
    } else {
      displayValue = formatMonthLabel(value);
    }
  }
  
  const textColor = isHovered ? '#AC66DA' : '#E7E4E4';

  // Time period options first, then months
  const timePeriodOptions = [
    { value: '', label: 'All Time' },
    { value: 'this_month', label: 'This Month' },
    { value: 'this_year', label: 'This Year' },
  ];

  const monthOptions = availableMonths.map(month => ({ 
    value: month, 
    label: formatMonthLabel(month) 
  }));

  const options = [
    ...timePeriodOptions,
    ...(monthOptions.length > 0 ? [{ value: 'divider', label: '---' }] : []),
    ...monthOptions,
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
          <CalendarCheck width={20} height={20} strokeWidth={1.5} style={{ color: textColor, transition: 'color 150ms ease-in-out' }} />
          <span className="font-semibold" style={{ transition: 'color 150ms ease-in-out' }}>{displayValue}</span>
        </div>
        <NavArrowDown width={16} height={16} strokeWidth={2} style={{ color: textColor, transition: 'color 150ms ease-in-out' }} />
      </button>
      
      {isOpen && (
        <div className="absolute top-full mt-2 left-0 right-0 rounded-2xl shadow-lg overflow-hidden z-10" style={{ backgroundColor: '#202020' }}>
          <div className="max-h-[200px] overflow-y-auto">
            {options.map((option, index) => {
              if (option.value === 'divider') {
                return (
                  <div 
                    key={`divider-${index}`}
                    className="px-4 py-2 border-t border-[#3a3a3a]"
                  >
                    <div className="text-xs uppercase tracking-wide" style={{ color: '#9CA3AF' }}>
                      Specific Months
                    </div>
                  </div>
                );
              }
              
              const isSelected = value === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 flex items-center gap-3 hover-text-purple transition-colors text-body cursor-pointer"
                  style={{ 
                    backgroundColor: 'transparent',
                    color: isSelected ? 'var(--accent-purple)' : 'var(--text-primary)' 
                  }}
                >
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

