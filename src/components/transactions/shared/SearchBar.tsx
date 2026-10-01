'use client';

import { Search } from 'iconoir-react';

interface SearchBarProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
}

/** Pill search input; icon, text and placeholder turn accent on hover and focus. */
export default function SearchBar({ placeholder = 'Search...', value, onChange }: SearchBarProps) {
  return (
    <div className="group relative">
      <Search
        width={20}
        height={20}
        strokeWidth={1.5}
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg transition-colors group-focus-within:text-accent-fg group-hover:text-accent-fg"
      />
      <input
        type="text"
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-full border-none bg-surface-0 py-2 pl-10 pr-4 text-base text-fg transition-colors placeholder:text-fg/70 focus:outline-none focus-visible:outline-2 focus-visible:outline-accent group-hover:text-accent-fg group-hover:placeholder:text-accent-fg/70 focus:text-accent-fg focus:placeholder:text-accent-fg/70 sm:text-body"
      />
    </div>
  );
}
