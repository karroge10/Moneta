import { cx } from '@/components/ui/cx';

export interface SkeletonProps {
  /** Size and shape via utilities, e.g. "h-4 w-24" or "size-10 rounded-full". Default radius is rounded-chip. */
  className?: string;
}

/** Pulsing placeholder block. Decorative, so hidden from assistive tech; wrap a loading region in aria-busy. */
export default function Skeleton({ className }: SkeletonProps) {
  return <div aria-hidden="true" className={cx('animate-pulse rounded-chip bg-surface-3', className)} />;
}
