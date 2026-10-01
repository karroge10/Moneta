'use client';

import { WarningCircle } from 'iconoir-react';
import Button from '@/components/ui/Button';
import { cx } from '@/components/ui/cx';

export interface ErrorStateProps {
  title?: string;
  /** Human message; pass error.message from an ApiError or a friendlier string. */
  message?: string;
  /** Shows a Retry button when set, e.g. query.refetch. */
  onRetry?: () => void;
  /** Spinner on the Retry button, e.g. query.isFetching. */
  retrying?: boolean;
  className?: string;
}

/** Inline error block with an optional retry, announced to screen readers via role="alert". */
export default function ErrorState({
  title = 'Something went wrong',
  message = 'We could not load this data. Check your connection and try again.',
  onRetry,
  retrying = false,
  className,
}: ErrorStateProps) {
  return (
    <div role="alert" className={cx('flex flex-col items-center justify-center gap-3 px-4 py-10 text-center', className)}>
      <div className="icon-circle size-12 bg-negative/10 text-negative-fg" aria-hidden="true">
        <WarningCircle width={24} height={24} strokeWidth={1.5} />
      </div>
      <div className="max-w-sm">
        <p className="text-copy font-semibold text-fg text-balance">{title}</p>
        <p className="mt-1 text-ui text-muted text-pretty">{message}</p>
      </div>
      {onRetry && (
        <Button variant="secondary" size="md" onClick={onRetry} loading={retrying}>
          Retry
        </Button>
      )}
    </div>
  );
}
