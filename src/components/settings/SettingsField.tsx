'use client';

import { useId, useState, type ReactNode } from 'react';
import ReviewDatePicker from '@/components/transactions/shared/ReviewDatePicker';
import TypeaheadSelect, { type TypeaheadOption } from '@/components/ui/TypeaheadSelect';
import { cx } from '@/components/ui/cx';

export interface SelectOptionItem {
  value: string;
  label: string;
  symbol?: string;
  alias?: string;
  icon?: ReactNode;
  countryCode?: string;
  searchTerms?: string[];
  suffix?: string;
}

interface SettingsFieldProps {
  label: string;
  value: string;
  icon: ReactNode;
  /** input: free text saved on blur or Enter; date: date picker; typeahead: searchable list. */
  type: 'input' | 'date' | 'typeahead';
  optionItems?: SelectOptionItem[];
  placeholder?: string;
  searchPlaceholder?: string;
  dropdownInPortal?: boolean;
  disabled?: boolean;
  onChange?: (value: string) => void;
}

/** One labelled settings control. Changes are reported through onChange; the parent saves them. */
export default function SettingsField({
  label,
  value,
  icon,
  type,
  optionItems = [],
  placeholder,
  searchPlaceholder = 'Search...',
  dropdownInPortal = false,
  disabled = false,
  onChange,
}: SettingsFieldProps) {
  const id = useId();

  if (type === 'date') {
    return (
      <div className="flex flex-col gap-2">
        <span className="text-ui font-medium text-secondary">{label}</span>
        <div className={FIELD_SHELL_CLASS}>
          <span className="shrink-0 text-secondary" aria-hidden="true">
            {icon}
          </span>
          <div className="min-w-0 flex-1">
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
    return (
      <div className="flex flex-col gap-2">
        <span className="text-ui font-medium text-secondary">{label}</span>
        <TypeaheadSelect
          options={toTypeaheadOptions(optionItems)}
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
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-ui font-medium text-secondary">
        {label}
      </label>
      <TextInput id={id} value={value} icon={icon} placeholder={placeholder} disabled={disabled} onChange={onChange} />
    </div>
  );
}

/** Text field that keeps a local draft while typing and reports it on blur or Enter. */
function TextInput({
  id,
  value,
  icon,
  placeholder,
  disabled,
  onChange,
}: {
  id: string;
  value: string;
  icon: ReactNode;
  placeholder?: string;
  disabled: boolean;
  onChange?: (value: string) => void;
}) {
  // null while not editing, so the field always shows the saved value otherwise.
  const [draft, setDraft] = useState<string | null>(null);

  const commit = () => {
    if (draft !== null && draft !== value) onChange?.(draft);
    setDraft(null);
  };

  return (
    <div className={cx(FIELD_SHELL_CLASS, 'focus-within:border-accent', disabled && 'cursor-not-allowed opacity-60')}>
      <span className="shrink-0 text-secondary" aria-hidden="true">
        {icon}
      </span>
      <input
        id={id}
        type="text"
        value={draft ?? value}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
        placeholder={placeholder}
        disabled={disabled}
        className="min-w-0 flex-1 border-none bg-transparent text-base text-fg outline-none placeholder:text-muted disabled:cursor-not-allowed sm:text-ui"
      />
    </div>
  );
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

const FIELD_SHELL_CLASS = 'flex min-h-10 items-center gap-3 rounded-control border border-line bg-surface-0 px-4 py-2 transition-colors';
