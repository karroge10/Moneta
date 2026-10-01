'use client';

import { cx } from '@/components/ui/cx';

const RANGE_OPTIONS = ['1W', '1M', '3M', '1Y', 'All'] as const;

interface RangeTabsProps {
  value: string;
  onChange: (range: string) => void;
  disabled?: boolean;
  label: string;
}

/** Segmented control for chart time ranges. */
export default function RangeTabs({ value, onChange, disabled = false, label }: RangeTabsProps) {
  return (
    <div role="group" aria-label={label} className="flex rounded-control border border-line bg-surface-0 p-1">
      {RANGE_OPTIONS.map((range) => {
        const selected = value === range;
        return (
          <button
            key={range}
            type="button"
            onClick={() => onChange(range)}
            disabled={disabled}
            aria-pressed={selected}
            className={cx(
              'min-h-8 rounded-chip px-3 text-caption font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
              selected ? 'bg-accent text-on-accent' : 'text-secondary hover:text-fg',
            )}
          >
            {range}
          </button>
        );
      })}
    </div>
  );
}
