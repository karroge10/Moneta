'use client';

import { ReactNode, useState, useRef, useEffect } from 'react';
import { NavArrowDown } from 'iconoir-react';

interface DropdownProps {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  iconLeft?: ReactNode;
}

export default function Dropdown({ label, options, value, onChange, iconLeft }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
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

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-full transition-colors hover:opacity-90 cursor-pointer"
        style={{ backgroundColor: '#282828', color: '#E7E4E4' }}
      >
        {iconLeft}
        <span className="text-sm font-semibold">{value}</span>
        <NavArrowDown width={16} height={16} strokeWidth={2} />
      </button>
      
      {isOpen && (
        <div className="absolute top-full mt-2 right-0 rounded-2xl shadow-lg overflow-hidden z-10 min-w-[160px]" style={{ backgroundColor: 'var(--bg-surface)' }}>
          {options.map((option) => (
            <button
              key={option}
              onClick={() => {
                onChange(option);
                setIsOpen(false);
              }}
              className="w-full text-left px-4 py-3 hover-text-purple transition-colors text-body cursor-pointer"
              style={{ 
                backgroundColor: 'transparent',
                color: value === option ? 'var(--accent-purple)' : 'var(--text-primary)' 
              }}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

