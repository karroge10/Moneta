'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { NavArrowDown, User, City, Suitcase } from 'iconoir-react';
import type { DemographicDimension } from '@/lib/statistics/cohort';
import { cx } from '@/components/ui/cx';

interface DimensionPickerProps {
  value: DemographicDimension;
  onChange: (dimension: DemographicDimension) => void;
}

/** Pill button with a small menu to compare by age group, country or profession. */
export default function DimensionPicker({ value, onChange }: DimensionPickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const CurrentIcon = DIMENSION_ICONS[value];

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current && !rootRef.current.contains(target)) setOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') setOpen(false);
  };

  const select = (dimension: DemographicDimension) => {
    onChange(dimension);
    setOpen(false);
  };

  return (
    <div className="relative w-full" ref={rootRef} onKeyDown={handleKeyDown}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-10 w-full items-center justify-between gap-2 rounded-full bg-surface-0 px-4 text-body text-fg transition-colors hover:text-accent-fg focus-visible:outline-2 focus-visible:outline-accent"
      >
        <span className="flex items-center gap-2">
          <CurrentIcon width={20} height={20} strokeWidth={1.5} aria-hidden="true" />
          <span className="font-semibold">{DIMENSION_LABELS[value]}</span>
        </span>
        <NavArrowDown width={16} height={16} strokeWidth={2} aria-hidden="true" />
      </button>
      {open && (
        <div role="menu" className="absolute left-0 right-0 top-full z-10 mt-2 min-w-[200px] overflow-hidden rounded-panel bg-surface-0 shadow-lg">
          {DIMENSIONS.map((dimension) => {
            const Icon = DIMENSION_ICONS[dimension];
            const isSelected = dimension === value;
            return (
              <button
                key={dimension}
                type="button"
                role="menuitemradio"
                aria-checked={isSelected}
                onClick={() => select(dimension)}
                className={cx(
                  'flex w-full items-center gap-3 px-4 py-3 text-left text-body transition-colors hover:bg-surface-1',
                  isSelected ? 'text-accent-fg' : 'text-fg',
                )}
              >
                <Icon width={20} height={20} strokeWidth={1.5} className="shrink-0" aria-hidden="true" />
                <span>{DIMENSION_LABELS[dimension]}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const DIMENSIONS: DemographicDimension[] = ['age', 'country', 'profession'];

const DIMENSION_LABELS: Record<DemographicDimension, string> = {
  age: 'By age group',
  country: 'By country',
  profession: 'By profession',
};

const DIMENSION_ICONS: Record<DemographicDimension, typeof User> = {
  age: User,
  country: City,
  profession: Suitcase,
};
