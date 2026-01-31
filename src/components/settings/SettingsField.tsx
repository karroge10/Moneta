'use client';

import { useState, useRef, useEffect } from 'react';
import { NavArrowDown, Edit } from 'iconoir-react';
import { ReactNode } from 'react';
import ReviewDatePicker from '@/components/transactions/shared/ReviewDatePicker';
import TypeaheadSelect, { type TypeaheadOption } from '@/components/ui/TypeaheadSelect';

/** Unified option with optional icon/symbol for dropdowns */
export interface SelectOptionItem {
  value: string;
  label: string;
  symbol?: string;
  /** When symbol is present, display text next to it (e.g. "USD" for "$ USD") */
  alias?: string;
  icon?: ReactNode;
  /** ISO 3166-1 alpha-2 for flags (typeahead). */
  countryCode?: string;
  /** Extra search terms (typeahead). */
  searchTerms?: string[];
  /** Additional display text on the right, e.g. currency symbol. */
  suffix?: string;
}

const DROPDOWN_OPTION_STYLE = {
  row: 'w-full text-left px-4 py-2 flex items-center gap-3 text-body cursor-pointer transition-colors hover:bg-[#2a2a2a]',
  iconSize: 18,
  currencySymbolColor: '#C9A227',
  textColor: 'var(--text-primary)',
  selectedColor: 'var(--accent-purple)',
} as const;

interface SettingsFieldProps {
  label: string;
  value: string;
  icon: ReactNode;
  type: 'input' | 'select' | 'date' | 'typeahead';
  options?: string[];
  /** When provided, used for select with optional icons/symbols; overrides options for display */
  optionItems?: SelectOptionItem[];
  placeholder?: string;
  /** Enable type-ahead filter (e.g. for currency) - only for type="select" */
  searchable?: boolean;
  /** Search input placeholder for typeahead. */
  searchPlaceholder?: string;
  /** When true (typeahead only), render dropdown in a portal so it is not clipped. */
  dropdownInPortal?: boolean;
  /** When true, field is disabled (e.g. while saving). */
  disabled?: boolean;
  onEdit?: () => void;
  onChange?: (value: string) => void;
}

function toTypeaheadOptions(items: SelectOptionItem[]): TypeaheadOption[] {
  return items.map((item) => ({
    value: item.value,
    label: item.label,
    countryCode: item.countryCode,
    icon: item.icon,
    searchTerms: item.searchTerms,
    suffix: item.suffix,
    symbol: item.symbol,
  }));
}

export default function SettingsField({
  label,
  value,
  icon,
  type,
  options = [],
  optionItems,
  placeholder,
  searchable = false,
  searchPlaceholder = 'Search...',
  dropdownInPortal = false,
  disabled = false,
  onEdit,
  onChange,
}: SettingsFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(value);
  const [inputValue, setInputValue] = useState(value);
  const [searchQuery, setSearchQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSelectedValue(value);
    setInputValue(value);
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

  useEffect(() => {
    if (isOpen && searchable) {
      setSearchQuery('');
      setTimeout(() => searchInputRef.current?.focus(), 0);
    }
  }, [isOpen, searchable]);

  const handleSelect = (optionValue: string) => {
    setSelectedValue(optionValue);
    onChange?.(optionValue);
    setIsOpen(false);
  };

  const isEditableInput = type === 'input' && onChange;

  const effectiveOptions: SelectOptionItem[] =
    optionItems ?? options.map((o) => ({ value: o, label: o }));
  const filteredOptions = searchable && searchQuery.trim()
    ? effectiveOptions.filter(
        (item) =>
          item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.value.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : effectiveOptions;

  if (type === 'date') {
    return (
      <div className="flex flex-col gap-2">
        <label className="text-body" style={{ color: '#E7E4E4' }}>
          {label}
        </label>
        <div className="flex items-center gap-3 px-4 py-2 rounded-xl border border-[#3a3a3a]" style={{ backgroundColor: '#202020' }}>
          <div className="shrink-0">{icon}</div>
          <div className="flex-1 min-w-0">
            <ReviewDatePicker
              value={value || ''}
              onChange={(v) => onChange?.(v)}
              placeholder={placeholder ?? 'Select date'}
              disabled={disabled}
            />
          </div>
        </div>
      </div>
    );
  }

  if (type === 'typeahead') {
    const typeaheadItems = optionItems ?? options.map((o) => ({ value: o, label: o }));
    return (
      <div className="flex flex-col gap-2">
        <label className="text-body" style={{ color: '#E7E4E4' }}>
          {label}
        </label>
        <div className="flex-1 min-w-0">
          <TypeaheadSelect
            options={toTypeaheadOptions(typeaheadItems)}
            value={value}
            onChange={(v) => onChange?.(v)}
            placeholder={placeholder ?? 'Select...'}
            searchPlaceholder={searchPlaceholder}
            aria-label={label}
            placeholderIcon={icon}
            dropdownInPortal={dropdownInPortal}
            disabled={disabled}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-body" style={{ color: '#E7E4E4' }}>
        {label}
      </label>
      <div className="relative" ref={ref}>
        {isEditableInput ? (
          <div
            className={`flex items-center gap-3 px-4 py-2 rounded-xl border border-[#3a3a3a] ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
            style={{ backgroundColor: '#202020', color: '#B9B9B9' }}
          >
            <div className="shrink-0">{icon}</div>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onBlur={() => {
                if (inputValue !== value) onChange?.(inputValue);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  (e.target as HTMLInputElement).blur();
                }
              }}
              placeholder={placeholder}
              disabled={disabled}
              className="flex-1 text-body bg-transparent border-none outline-none min-w-0 placeholder:[color:var(--text-secondary)] disabled:cursor-not-allowed"
              style={{ color: '#E7E4E4' }}
              aria-label={label}
            />
          </div>
        ) : (
          <div
            className={`flex items-center gap-3 px-4 py-2 rounded-xl border border-[#3a3a3a] ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
            style={{ backgroundColor: '#202020', color: '#B9B9B9' }}
            onClick={() => {
              if (disabled) return;
              if (type === 'select') {
                setIsOpen(!isOpen);
              } else if (onEdit) {
                onEdit();
              }
            }}
          >
            <div className="shrink-0">{icon}</div>
            <span className="flex-1 text-body" style={{ color: (type === 'select' ? selectedValue : value) ? '#B9B9B9' : 'var(--text-secondary)' }}>
              {type === 'select' ? (selectedValue || placeholder || '') : (value || placeholder || '')}
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
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="shrink-0 hover:opacity-70 transition-opacity cursor-pointer"
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
        )}

        {type === 'select' && isOpen && (
          <div
            className="absolute top-full mt-2 left-0 right-0 rounded-2xl shadow-lg overflow-hidden z-10 border border-[#3a3a3a]"
            style={{ backgroundColor: '#202020' }}
          >
            {searchable && (
              <div className="p-2 border-b border-[#2A2A2A]">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.stopPropagation()}
                  placeholder="Search..."
                  className="w-full px-3 py-2 rounded-xl text-body bg-[#282828] border border-[#3a3a3a] outline-none focus:border-[var(--accent-purple)]"
                  style={{ color: 'var(--text-primary)' }}
                />
              </div>
            )}
            <div className="max-h-[240px] overflow-y-auto custom-scrollbar">
              {filteredOptions.map((item) => {
                const isSelected = selectedValue === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => handleSelect(item.value)}
                    className={DROPDOWN_OPTION_STYLE.row}
                    style={{
                      backgroundColor: 'transparent',
                      color: isSelected ? DROPDOWN_OPTION_STYLE.selectedColor : DROPDOWN_OPTION_STYLE.textColor,
                    }}
                  >
                    {item.symbol != null ? (
                      <span
                        className="shrink-0 font-semibold"
                        style={{
                          fontSize: DROPDOWN_OPTION_STYLE.iconSize,
                          lineHeight: 1,
                          color: DROPDOWN_OPTION_STYLE.currencySymbolColor,
                        }}
                      >
                        {item.symbol}
                      </span>
                    ) : item.icon ? (
                      <span className="shrink-0 flex items-center justify-center" style={{ width: DROPDOWN_OPTION_STYLE.iconSize, height: DROPDOWN_OPTION_STYLE.iconSize }}>
                        {item.icon}
                      </span>
                    ) : null}
                    <span className="flex-1 min-w-0 truncate">
                      {item.symbol != null && item.alias != null ? item.alias : item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

