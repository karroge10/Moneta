'use client';

import { cx } from '@/components/ui/cx';

type Side = 'buy' | 'sell';

interface BuySellToggleProps {
  value: Side;
  onChange: (side: Side) => void;
  disabled?: boolean;
  /** Disables only Sell, e.g. when the asset is not owned. */
  sellDisabledReason?: string;
}

/** Two-option Buy / Sell switch. */
export default function BuySellToggle({ value, onChange, disabled = false, sellDisabledReason }: BuySellToggleProps) {
  return (
    <div role="group" aria-label="Transaction type" className="flex h-11 gap-0.5 rounded-control border border-line bg-surface-0 p-0.5">
      <SideButton side="buy" selected={value === 'buy'} onSelect={onChange} disabled={disabled} />
      <SideButton
        side="sell"
        selected={value === 'sell'}
        onSelect={onChange}
        disabled={disabled || Boolean(sellDisabledReason)}
        title={sellDisabledReason}
      />
    </div>
  );
}

interface SideButtonProps {
  side: Side;
  selected: boolean;
  onSelect: (side: Side) => void;
  disabled: boolean;
  title?: string;
}

function SideButton({ side, selected, onSelect, disabled, title }: SideButtonProps) {
  const selectedClass = side === 'buy' ? 'bg-positive text-surface-0' : 'bg-negative text-fg';
  return (
    <button
      type="button"
      onClick={() => onSelect(side)}
      disabled={disabled}
      aria-pressed={selected}
      title={title}
      className={cx(
        'flex flex-1 items-center justify-center rounded-chip px-3 text-ui font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        selected ? selectedClass : 'text-muted hover:text-fg',
      )}
    >
      {side === 'buy' ? 'Buy' : 'Sell'}
    </button>
  );
}
