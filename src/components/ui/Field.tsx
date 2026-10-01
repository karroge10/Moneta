'use client';

import { useId, type ReactNode } from 'react';
import { cx } from '@/components/ui/cx';

/** Props Field hands to its control; spread them onto the input, select or textarea. */
export interface FieldControlProps {
  id: string;
  'aria-describedby': string | undefined;
  'aria-invalid': true | undefined;
}

export interface FieldProps {
  label: ReactNode;
  /** Help text under the control. Hidden while an error is shown. */
  hint?: ReactNode;
  /** Error text; also sets aria-invalid on the control. */
  error?: ReactNode;
  /** Render prop so the control gets id and aria wiring: {(props) => <input {...props} className={inputClass} />}. */
  children: (props: FieldControlProps) => ReactNode;
  className?: string;
}

/** Label + control + hint or error, wired with htmlFor, aria-describedby and aria-invalid. */
export default function Field({ label, hint, error, children, className }: FieldProps) {
  const id = useId();
  const messageId = `${id}-message`;
  const message = error ?? hint;
  const controlProps: FieldControlProps = {
    id,
    'aria-describedby': message ? messageId : undefined,
    'aria-invalid': error ? true : undefined,
  };

  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-ui font-medium text-secondary">
        {label}
      </label>
      {children(controlProps)}
      {message && (
        <p id={messageId} className={cx('text-caption', error ? 'text-negative-fg' : 'text-muted')}>
          {message}
        </p>
      )}
    </div>
  );
}

/** Shared look for text inputs, selects and textareas. 16px on mobile so iOS does not zoom. */
export const inputClass = cx(
  'w-full min-h-10 rounded-control border border-line bg-surface-inset px-3 py-2 text-base text-fg sm:text-ui',
  'placeholder:text-muted transition-colors hover:border-line-strong',
  'focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent/40',
  'aria-invalid:border-negative disabled:cursor-not-allowed disabled:opacity-50',
);
