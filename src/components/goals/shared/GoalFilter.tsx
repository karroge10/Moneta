'use client';

import { useState, useRef, useEffect } from 'react';
import { NavArrowDown, Filter, CheckCircle, Clock, Xmark } from 'iconoir-react';
import { GoalStatus } from '@/lib/goalUtils';

interface GoalFilterProps {
  selectedStatus: GoalStatus | 'all' | null;
  onSelect: (status: GoalStatus | 'all' | null) => void;
}

const statusOptions: Array<{ value: GoalStatus | 'all'; label: string; icon: typeof CheckCircle }> = [
  { value: 'all', label: 'All Goals', icon: Filter },
  { value: 'active', label: 'Active', icon: Clock },
  { value: 'completed', label: 'Completed', icon: CheckCircle },
  { value: 'failed', label: 'Failed', icon: Xmark },
];

export default function GoalFilter({ selectedStatus, onSelect }: GoalFilterProps) {
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

  const selectedOption = statusOptions.find(opt => opt.value === selectedStatus) || statusOptions[0];
  const displayValue = selectedOption.label;
  const textColor = isHovered ? '#AC66DA' : '#E7E4E4';
  const DisplayIcon = selectedOption.icon;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="flex items-center gap-2 px-4 py-2 rounded-full transition-colors cursor-pointer w-full justify-between"
        style={{ backgroundColor: '#202020', color: textColor }}
      >
        <div className="flex items-center gap-2">
          <Filter width={18} height={18} strokeWidth={1.5} style={{ color: textColor }} />
          <span className="text-sm font-semibold">{displayValue}</span>
        </div>
        <NavArrowDown width={16} height={16} strokeWidth={2} style={{ color: textColor }} />
      </button>
      
      {isOpen && (
        <div className="absolute top-full mt-2 left-0 right-0 rounded-2xl shadow-lg overflow-hidden z-10" style={{ backgroundColor: '#202020' }}>
          {statusOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = selectedStatus === option.value;
            return (
              <button
                key={option.value}
                onClick={() => {
                  onSelect(option.value);
                  setIsOpen(false);
                }}
                className="w-full text-left px-4 py-3 flex items-center gap-3 hover-text-purple transition-colors text-body cursor-pointer"
                style={{ 
                  backgroundColor: 'transparent',
                  color: isSelected ? 'var(--accent-purple)' : 'var(--text-primary)' 
                }}
              >
                <Icon width={20} height={20} strokeWidth={1.5} style={{ color: isSelected ? 'var(--accent-purple)' : 'var(--text-primary)' }} />
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

