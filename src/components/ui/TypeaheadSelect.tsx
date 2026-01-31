'use client';

import { useState, useRef, useEffect, useLayoutEffect, useCallback, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { NavArrowDown, Search, Globe } from 'iconoir-react';

const FLAGS_API_BASE = 'https://flagsapi.com';

export interface TypeaheadOption {
  value: string;
  label: string;
  /** ISO 3166-1 alpha-2 for flagsapi.com. Optional. */
  countryCode?: string;
  /** When no countryCode, e.g. symbol for currency. */
  icon?: ReactNode;
  /** Extra text for search, e.g. "United States" for USD. */
  searchTerms?: string[];
  /** Additional display text, e.g. currency symbol on the right. */
  suffix?: string;
}

interface TypeaheadSelectProps {
  options: TypeaheadOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Optional container ref for constraining dropdown (e.g. scroll parent). */
  containerRef?: React.RefObject<HTMLElement | null>;
  /** Search input placeholder. */
  searchPlaceholder?: string;
  /** Optional id for trigger (accessibility). */
  id?: string;
  /** Optional label for trigger (for screen readers). */
  'aria-label'?: string;
  /** Icon shown next to placeholder when nothing is selected. */
  placeholderIcon?: ReactNode;
  /** When true, render dropdown in a portal (document.body) with fixed position so it is not clipped. */
  dropdownInPortal?: boolean;
}

const DROPDOWN_HEIGHT = 240;
const DROPDOWN_MARGIN = 8;
const PORTAL_Z_INDEX = 1000;
const OPTION_ROW = 'w-full text-left px-4 py-3 flex items-center gap-3 text-body cursor-pointer transition-colors hover:bg-[#2a2a2a]';

/** Country codes that have no flag on flagsapi.com (e.g. EU); show Globe instead. */
const NO_FLAG_COUNTRY_CODES = new Set(['EU']);

function getFlagUrl(countryCode: string, size = 24): string {
  return `${FLAGS_API_BASE}/${countryCode}/flat/${size}.png`;
}

function hasValidFlag(countryCode: string | undefined): boolean {
  return Boolean(countryCode && !NO_FLAG_COUNTRY_CODES.has(countryCode));
}

function matchesQuery(option: TypeaheadOption, query: string): boolean {
  const q = query.toLowerCase().trim();
  if (!q) return true;
  const labelMatch = option.label.toLowerCase().includes(q);
  const valueMatch = option.value.toLowerCase().includes(q);
  const searchMatch =
    option.searchTerms?.some((term) => term.toLowerCase().includes(q)) ?? false;
  return labelMatch || valueMatch || searchMatch;
}

export default function TypeaheadSelect({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  disabled = false,
  containerRef,
  searchPlaceholder = 'Search...',
  id,
  'aria-label': ariaLabel,
  placeholderIcon,
  dropdownInPortal = false,
}: TypeaheadSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((o) => o.value === value);
  const hasUnmatchedValue = value && !selectedOption;
  const filteredOptions = searchQuery.trim()
    ? options.filter((o) => matchesQuery(o, searchQuery))
    : options;

  const updatePosition = useCallback(() => {
    if (!isOpen || !ref.current) return;

    const triggerRect = ref.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - triggerRect.bottom;
    const spaceAbove = triggerRect.top;

    const container = containerRef?.current;
    let spaceBelowInContainer = spaceBelow;
    let spaceAboveInContainer = spaceAbove;

    if (container) {
      const containerRect = container.getBoundingClientRect();
      spaceBelowInContainer = containerRect.bottom - triggerRect.bottom;
      spaceAboveInContainer = triggerRect.top - containerRect.top;
    }

    const shouldOpenUp =
      spaceBelowInContainer < DROPDOWN_HEIGHT &&
      spaceAboveInContainer > spaceBelowInContainer;
    setOpenUpward(shouldOpenUp);

    if (dropdownInPortal && dropdownRef.current) {
      const top = shouldOpenUp
        ? Math.max(DROPDOWN_MARGIN, triggerRect.top - DROPDOWN_HEIGHT - DROPDOWN_MARGIN)
        : Math.min(triggerRect.bottom + DROPDOWN_MARGIN, window.innerHeight - DROPDOWN_HEIGHT - DROPDOWN_MARGIN);
      const left = Math.max(DROPDOWN_MARGIN, Math.min(triggerRect.left, window.innerWidth - triggerRect.width - DROPDOWN_MARGIN));
      const el = dropdownRef.current;
      el.style.left = `${left}px`;
      el.style.top = `${top}px`;
      el.style.width = `${triggerRect.width}px`;
    }
  }, [isOpen, containerRef, dropdownInPortal]);

  useLayoutEffect(() => {
    if (!isOpen) return;

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, updatePosition]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const inTrigger = ref.current?.contains(target);
      const inDropdown = dropdownInPortal && dropdownRef.current?.contains(target);
      if (!inTrigger && !inDropdown) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownInPortal]);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setTimeout(() => searchInputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const dropdownContent = (
    <>
      <div className="p-2 border-b border-[#2A2A2A]">
        <div className="relative">
          <Search
            width={18}
            height={18}
            strokeWidth={1.5}
            className="absolute left-3 top-1/2 -translate-y-1/2 shrink-0"
            style={{ color: '#9CA3AF' }}
          />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            placeholder={searchPlaceholder}
            className="w-full pl-9 pr-3 py-2 rounded-lg text-body bg-[#282828] border border-[#3a3a3a] outline-none focus:border-[var(--accent-purple)]"
            style={{ color: 'var(--text-primary)' }}
            aria-label="Search options"
          />
        </div>
      </div>
      <div className="max-h-[240px] overflow-y-auto custom-scrollbar">
        {filteredOptions.length === 0 ? (
          <div
            className="px-4 py-3 text-body"
            style={{ color: 'var(--text-secondary)' }}
          >
            No matches found
          </div>
        ) : (
          filteredOptions.map((option) => {
            const isSelected = value === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(option.value)}
                className={OPTION_ROW}
                style={{
                  backgroundColor: 'transparent',
                  color: isSelected ? 'var(--accent-purple)' : 'var(--text-primary)',
                }}
              >
                {hasValidFlag(option.countryCode) ? (
                  <img
                    src={getFlagUrl(option.countryCode!)}
                    alt=""
                    className="w-6 h-4 object-cover rounded shrink-0"
                  />
                ) : option.icon ? (
                  <span className="shrink-0 flex items-center justify-center [&>svg]:w-5 [&>svg]:h-5">
                    {option.icon}
                  </span>
                ) : (
                  <span className="shrink-0 flex items-center justify-center [&>svg]:w-5 [&>svg]:h-5" style={{ color: 'var(--text-primary)' }}>
                    <Globe width={20} height={20} strokeWidth={1.5} />
                  </span>
                )}
                <span className="flex-1 min-w-0 truncate text-left">
                  {option.label}
                </span>
                {option.suffix ? (
                  <span
                    className="shrink-0 text-sm font-semibold"
                    style={{
                      color: isSelected ? 'var(--accent-purple)' : 'var(--accent-purple)',
                    }}
                  >
                    {option.suffix}
                  </span>
                ) : null}
              </button>
            );
          })
        )}
      </div>
    </>
  );

  return (
    <div className="relative w-full" ref={ref}>
      <button
        type="button"
        id={id}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg w-full text-body cursor-pointer transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        style={{
          backgroundColor: '#202020',
          color: selectedOption ? '#E7E4E4' : 'var(--text-secondary)',
          border: '1px solid #3a3a3a',
        }}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {selectedOption ? (
            <>
              {hasValidFlag(selectedOption.countryCode) ? (
                <img
                  src={getFlagUrl(selectedOption.countryCode!)}
                  alt=""
                  className="w-6 h-4 object-cover rounded shrink-0"
                />
              ) : selectedOption.icon ? (
                <span className="shrink-0 flex items-center justify-center [&>svg]:w-5 [&>svg]:h-5">
                  {selectedOption.icon}
                </span>
              ) : (
                <span className="shrink-0 flex items-center justify-center [&>svg]:w-5 [&>svg]:h-5" style={{ color: 'var(--text-primary)' }}>
                  <Globe width={20} height={20} strokeWidth={1.5} />
                </span>
              )}
              <span className="truncate">
                {selectedOption.label}
                {selectedOption.suffix ? ` ${selectedOption.suffix}` : ''}
              </span>
            </>
          ) : hasUnmatchedValue ? (
            <span className="truncate">{value}</span>
          ) : (
            <>
              {placeholderIcon ? (
                <span className="shrink-0 flex items-center justify-center [&>svg]:w-5 [&>svg]:h-5" style={{ color: '#B9B9B9' }}>
                  {placeholderIcon}
                </span>
              ) : null}
              <span>{placeholder}</span>
            </>
          )}
        </div>
        <NavArrowDown
          width={16}
          height={16}
          strokeWidth={2}
          style={{
            color: '#B9B9B9',
            transform: isOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform 150ms ease',
          }}
        />
      </button>

      {isOpen && !dropdownInPortal && (
        <div
          className={`absolute left-0 right-0 rounded-2xl shadow-lg overflow-hidden border border-[#3a3a3a] z-50 ${
            openUpward ? 'bottom-full mb-2' : 'top-full mt-2'
          }`}
          style={{ backgroundColor: '#202020' }}
          role="listbox"
        >
          {dropdownContent}
        </div>
      )}
      {isOpen && dropdownInPortal && typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={dropdownRef}
            className="rounded-2xl shadow-lg overflow-hidden border border-[#3a3a3a]"
            style={{
              position: 'fixed',
              zIndex: PORTAL_Z_INDEX,
              backgroundColor: '#202020',
            }}
            role="listbox"
          >
            {dropdownContent}
          </div>,
          document.body
        )}
    </div>
  );
}
