'use client';

import { useRef, useState, type ReactNode } from 'react';
import { NavArrowDown } from 'iconoir-react';
import { cx } from '@/components/ui/cx';
import { inputClass } from '@/components/ui/Field';
import type { FieldControlProps } from '@/components/ui/Field';
import CalendarPopover from '@/components/transactions/shared/CalendarPopover';
import { formatDateForDisplay } from '@/lib/dateFormatting';
import { useCloseOnOutsideClick } from '@/hooks/transactions/useCloseOnOutsideClick';

export interface FormSelectOption {
  value: string;
  label: string;
  icon?: ReactNode;
}

interface FormSelectProps {
  control: FieldControlProps;
  options: FormSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  /** Icon shown in the trigger next to the selected label. */
  selectedIcon?: ReactNode;
  disabled?: boolean;
  /** Extra classes for the label inside the trigger, e.g. "capitalize". */
  labelClassName?: string;
}

/** Field-styled listbox trigger with an inline option list; opens upward when there is no room below. */
export default function FormSelect({
  control,
  options,
  value,
  onChange,
  placeholder,
  selectedIcon,
  disabled = false,
  labelClassName,
}: FormSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value);

  useCloseOnOutsideClick(containerRef, isOpen, () => setIsOpen(false));

  const toggle = () => {
    if (!isOpen) {
      const rect = containerRef.current?.getBoundingClientRect();
      const spaceBelow = rect ? window.innerHeight - rect.bottom : Infinity;
      setOpenUpward(spaceBelow < 280);
    }
    setIsOpen((open) => !open);
  };

  const choose = (next: string) => {
    onChange(next);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        {...control}
        onClick={toggle}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={cx(inputClass, 'flex items-center justify-between gap-2 text-left cursor-pointer')}
      >
        <span className={cx('flex items-center gap-2 font-semibold', selected ? 'text-fg' : 'text-muted', labelClassName)}>
          {selected && selectedIcon}
          {selected?.label ?? placeholder}
        </span>
        <NavArrowDown width={16} height={16} strokeWidth={2} className="shrink-0 text-fg" aria-hidden="true" />
      </button>

      {isOpen && (
        <ul
          role="listbox"
          className={cx(
            'absolute left-0 right-0 z-10 max-h-64 overflow-y-auto rounded-panel border border-line bg-surface-0 shadow-lg',
            openUpward ? 'bottom-full mb-2' : 'top-full mt-2',
          )}
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <li key={option.value} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  onClick={() => choose(option.value)}
                  className={cx(
                    'flex w-full items-center gap-3 px-4 py-3 text-left text-body transition-colors hover:bg-surface-2 cursor-pointer',
                    isSelected ? 'text-accent-fg' : 'text-fg',
                    labelClassName,
                  )}
                >
                  {option.icon}
                  <span>{option.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

interface DateFieldButtonProps {
  control: FieldControlProps;
  /** YYYY-MM-DD or ''. */
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
}

/** Field-styled trigger that opens a calendar popover and shows the picked date. */
export function DateFieldButton({ control, value, onChange, placeholder, disabled = false }: DateFieldButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const label = value ? formatDateForDisplay(value) : placeholder;

  const handleSelect = (next: string) => {
    onChange(next);
    setIsOpen(false);
  };

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        {...control}
        onClick={() => setIsOpen((open) => !open)}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className={cx(inputClass, 'flex items-center justify-between gap-2 text-left cursor-pointer')}
      >
        <span className={cx('font-semibold tabular-nums', value ? 'text-fg' : 'text-muted')}>{label}</span>
        <NavArrowDown width={16} height={16} strokeWidth={2} className="shrink-0 text-fg" aria-hidden="true" />
      </button>
      {isOpen && (
        <CalendarPopover
          anchorRef={triggerRef}
          value={value}
          onSelect={handleSelect}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
