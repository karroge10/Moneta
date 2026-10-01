'use client';

import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { NavArrowDown } from 'iconoir-react';
import Field, { inputClass } from '@/components/ui/Field';
import { CalendarPanel } from '@/components/transactions/shared/CalendarPanel';
import { cx } from '@/components/ui/cx';
import { formatDateForDisplay, formatDateToInput } from '@/lib/dateFormatting';

interface DateFieldProps {
  label: string;
  /** Any parseable date; empty shows the placeholder. */
  value: string;
  /** Receives YYYY-MM-DD. */
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

/** Labelled date button that opens a calendar in a portal, so it is never clipped by a scrolling dialog. */
export default function DateField({ label, value, onChange, disabled = false, placeholder = 'Select a date' }: DateFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [month, setMonth] = useState(() => initialMonth(value));
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!isOpen) return;
    const reposition = () => placePanel(triggerRef.current, panelRef.current);
    reposition();
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const insideTrigger = triggerRef.current?.contains(target);
      const insidePanel = panelRef.current?.contains(target);
      if (!insideTrigger && !insidePanel) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [isOpen]);

  const handleSelect = (next: string) => {
    onChange(next);
    if (next) setMonth(new Date(next));
    setIsOpen(false);
  };

  const handlePanelKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Escape') return;
    event.stopPropagation();
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const selected = formatDateToInput(value);

  return (
    <Field label={label}>
      {(controlProps) => (
        <>
          <button
            {...controlProps}
            ref={triggerRef}
            type="button"
            onClick={() => setIsOpen((open) => !open)}
            disabled={disabled}
            aria-expanded={isOpen}
            aria-haspopup="dialog"
            className={cx(inputClass, 'flex items-center justify-between gap-2 text-left')}
          >
            <span className={value ? 'text-fg' : 'text-muted'}>{value ? formatDateForDisplay(value) : placeholder}</span>
            <NavArrowDown width={16} height={16} strokeWidth={2} className="shrink-0 text-secondary" aria-hidden="true" />
          </button>
          {isOpen &&
            createPortal(
              <div
                ref={panelRef}
                onKeyDown={handlePanelKeyDown}
                className="fixed z-[1000] w-max min-w-80 overflow-hidden rounded-panel border border-line bg-surface-0 shadow-lg"
                style={{ top: -9999, left: -9999 }}
              >
                <CalendarPanel
                  selectedDate={selected}
                  currentMonth={month}
                  onChange={handleSelect}
                  onMonthChange={setMonth}
                  controlAlignment="end"
                />
              </div>,
              document.body,
            )}
        </>
      )}
    </Field>
  );
}

const PANEL_MARGIN = 8;
const FALLBACK_HEIGHT = 340;
const FALLBACK_WIDTH = 320;

function initialMonth(value: string): Date {
  const input = formatDateToInput(value);
  return input ? new Date(input) : new Date();
}

/** Places the panel below the trigger, or above when there is more room there, kept inside the viewport. */
function placePanel(trigger: HTMLElement | null, panel: HTMLElement | null) {
  if (!trigger || !panel) return;
  const triggerRect = trigger.getBoundingClientRect();
  const panelRect = panel.getBoundingClientRect();
  const height = panelRect.height || FALLBACK_HEIGHT;
  const width = panelRect.width || FALLBACK_WIDTH;
  const spaceBelow = window.innerHeight - triggerRect.bottom;
  const spaceAbove = triggerRect.top;
  const openUp = height + PANEL_MARGIN > spaceBelow && spaceAbove > spaceBelow;

  const top = openUp
    ? Math.max(PANEL_MARGIN, triggerRect.top - height - PANEL_MARGIN)
    : Math.min(window.innerHeight - height - PANEL_MARGIN, triggerRect.bottom + PANEL_MARGIN);
  const maxLeft = Math.max(PANEL_MARGIN, window.innerWidth - width - PANEL_MARGIN);
  const left = Math.min(Math.max(triggerRect.left, PANEL_MARGIN), maxLeft);

  panel.style.top = `${top}px`;
  panel.style.left = `${left}px`;
}
