'use client';

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { CalendarPanel } from './CalendarPanel';

interface CalendarPopoverProps {
  /** Element the popover is placed against; clicks on it do not count as "outside". */
  anchorRef: RefObject<HTMLElement | null>;
  /** Selected date as YYYY-MM-DD, or ''. */
  value: string;
  onSelect: (value: string) => void;
  onClose: () => void;
  /** Fixed width in px; defaults to fit content with a 320px minimum. */
  width?: number;
}

const MARGIN = 8;

/**
 * Calendar in a body portal, positioned below the anchor (or above when there is no room) and kept in
 * place on scroll and resize. Mount it only while open so the visible month starts at `value`.
 */
export default function CalendarPopover({ anchorRef, value, onSelect, onClose, width }: CalendarPopoverProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [month, setMonth] = useState(() => initialMonth(value));

  useLayoutEffect(() => {
    const place = () => placePanel(anchorRef.current, panelRef.current);
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [anchorRef, month]);

  useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || anchorRef.current?.contains(target)) return;
      onClose();
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [anchorRef, onClose]);

  if (typeof document === 'undefined') return null;

  const sizeStyle = width ? { width } : { minWidth: 320, width: 'max-content' };

  const panel = (
    <div
      ref={panelRef}
      className="overflow-hidden rounded-panel border border-line bg-surface-0 shadow-lg"
      style={{ position: 'fixed', top: -9999, left: -9999, zIndex: 1000, maxWidth: '100vw', ...sizeStyle }}
    >
      <CalendarPanel
        selectedDate={value}
        currentMonth={month}
        onChange={onSelect}
        onMonthChange={setMonth}
        controlAlignment="end"
      />
    </div>
  );

  return createPortal(panel, document.body);
}

function initialMonth(value: string): Date {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

/** Writes top/left straight to the panel so placement needs no extra render. */
function placePanel(anchor: HTMLElement | null, panel: HTMLElement | null) {
  if (!anchor || !panel) return;
  const anchorRect = anchor.getBoundingClientRect();
  const panelRect = panel.getBoundingClientRect();
  const spaceBelow = window.innerHeight - anchorRect.bottom;
  const spaceAbove = anchorRect.top;
  const openUp = panelRect.height + MARGIN > spaceBelow && spaceAbove > spaceBelow;

  const top = openUp
    ? Math.max(MARGIN, anchorRect.top - panelRect.height - MARGIN)
    : Math.min(window.innerHeight - panelRect.height - MARGIN, anchorRect.bottom + MARGIN);
  const maxLeft = window.innerWidth - panelRect.width - MARGIN;
  const left = Math.min(Math.max(anchorRect.left, MARGIN), Math.max(MARGIN, maxLeft));

  panel.style.top = `${top}px`;
  panel.style.left = `${left}px`;
}
