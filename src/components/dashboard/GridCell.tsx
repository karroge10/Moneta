import type { ReactNode } from 'react';
import { cx } from '@/components/ui/cx';

/** Wide-screen grid cell that stretches the card inside it to the cell's height. */
export default function GridCell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx('flex min-h-0 flex-col [&>.card-surface]:flex [&>.card-surface]:h-full [&>.card-surface]:flex-col', className)}>
      {children}
    </div>
  );
}
