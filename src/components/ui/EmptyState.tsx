import type { ReactNode } from 'react';
import { cx } from '@/components/ui/cx';

export interface EmptyStateProps {
  /** Iconoir icon element, rendered at 24px inside a circle. */
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  /** Usually a Button that creates the first item. */
  action?: ReactNode;
  className?: string;
}

/** Centered "nothing here yet" block for lists, cards and pages. */
export default function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cx('flex flex-col items-center justify-center gap-3 px-4 py-10 text-center', className)}>
      {icon && (
        <div className="icon-circle size-12 bg-surface-2 text-secondary" aria-hidden="true">
          {icon}
        </div>
      )}
      <div className="max-w-sm">
        <p className="text-copy font-semibold text-fg text-balance">{title}</p>
        {description && <p className="mt-1 text-ui text-muted text-pretty">{description}</p>}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
