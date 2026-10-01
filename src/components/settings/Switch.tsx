'use client';

import { cx } from '@/components/ui/cx';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  /** Id of the visible label; use instead of aria-label when the label text is on screen. */
  labelledBy?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
}

/** On/off toggle with role="switch" and aria-checked, so screen readers announce the state. */
export default function Switch({ checked, onChange, disabled = false, labelledBy, ...aria }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      aria-label={aria['aria-label']}
      aria-describedby={aria['aria-describedby']}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx(
        'relative h-6 w-12 shrink-0 rounded-full transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        'disabled:cursor-not-allowed disabled:opacity-60',
        checked ? 'bg-accent' : 'bg-fg/30',
      )}
    >
      <span
        aria-hidden="true"
        className={cx(
          'absolute left-1 top-1 size-4 rounded-full bg-fg transition-transform duration-300 ease-in-out',
          checked ? 'translate-x-6' : 'translate-x-0',
        )}
      />
    </button>
  );
}
