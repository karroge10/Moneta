'use client';

import { useState, useRef, useEffect } from 'react';
import { NavArrowDown, Edit } from 'iconoir-react';
import { ReactNode } from 'react';

interface SettingsFieldProps {
  label: string;
  value: string;
  icon: ReactNode;
  type: 'input' | 'select';
  options?: string[];
  onEdit?: () => void;
  onChange?: (value: string) => void;
}

export default function SettingsField({ 
  label, 
  value, 
  icon, 
  type, 
  options = [], 
  onEdit,
  onChange 
}: SettingsFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(value);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedValue(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option: string) => {
    setSelectedValue(option);
    onChange?.(option);
    setIsOpen(false);
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-body" style={{ color: '#E7E4E4' }}>
        {label}
      </label>
      <div className="relative" ref={ref}>
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer"
          style={{ backgroundColor: '#202020', color: '#B9B9B9' }}
          onClick={() => {
            if (type === 'select') {
              setIsOpen(!isOpen);
            } else if (onEdit) {
              onEdit();
            }
          }}
        >
          <div className="flex-shrink-0">
            {icon}
          </div>
          <span className="flex-1 text-body" style={{ color: '#B9B9B9' }}>
            {type === 'select' ? selectedValue : value}
          </span>
          {type === 'select' ? (
            <NavArrowDown 
              width={16} 
              height={16} 
              strokeWidth={2} 
              style={{ color: '#B9B9B9' }}
            />
          ) : onEdit ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="flex-shrink-0 hover:opacity-70 transition-opacity"
            >
              <Edit 
                width={16} 
                height={16} 
                strokeWidth={1.5} 
                style={{ color: '#B9B9B9' }}
              />
            </button>
          ) : null}
        </div>
        
        {type === 'select' && isOpen && (
          <div 
            className="absolute top-full mt-2 left-0 right-0 rounded-2xl shadow-lg overflow-hidden z-10"
            style={{ backgroundColor: '#202020' }}
          >
            {options.map((option) => (
              <button
                key={option}
                onClick={() => handleSelect(option)}
                className="w-full text-left px-4 py-3 flex items-center gap-3 hover-text-purple transition-colors text-body cursor-pointer"
                style={{ 
                  backgroundColor: 'transparent',
                  color: selectedValue === option ? 'var(--accent-purple)' : 'var(--text-primary)' 
                }}
              >
                <span>{option}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

