'use client';

import { Search } from 'iconoir-react';
import { useState } from 'react';

interface SearchBarProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
}

export default function SearchBar({ placeholder = 'Search...', value, onChange }: SearchBarProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const isActive = isHovered || isFocused;
  const activeColor = isActive ? '#AC66DA' : '#E7E4E4';

  return (
    <div 
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <style dangerouslySetInnerHTML={{
        __html: `
          .search-input-active::placeholder {
            color: #AC66DA;
            opacity: 0.7;
          }
          .search-input-inactive::placeholder {
            color: #E7E4E4;
            opacity: 0.7;
          }
        `
      }} />
      <Search 
        width={20} 
        height={20} 
        strokeWidth={1.5} 
        className="absolute left-3 top-1/2 -translate-y-1/2 transition-colors"
        style={{ color: activeColor }}
      />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={`w-full pl-10 pr-4 py-2 rounded-full text-body border-none focus:outline-none transition-colors ${isActive ? 'search-input-active' : 'search-input-inactive'}`}
        style={{ 
          backgroundColor: '#202020',
          color: activeColor
        }}
      />
    </div>
  );
}


