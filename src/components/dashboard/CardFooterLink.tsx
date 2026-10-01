import type { ReactNode } from 'react';
import Link from 'next/link';
import { NavArrowRight } from 'iconoir-react';
import { cx } from '@/components/ui/cx';

interface CardFooterLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
}

/** Small "View All" style link at the bottom of a dashboard card. */
export default function CardFooterLink({ href, children, className }: CardFooterLinkProps) {
  return (
    <Link
      href={href}
      className={cx('text-helper flex w-fit items-start gap-1 transition-colors hover-text-purple', className)}
    >
      <span className="text-wrap-safe break-words leading-tight">{children}</span>
      <NavArrowRight width={14} height={14} className="mt-0.5 shrink-0 stroke-current" aria-hidden="true" />
    </Link>
  );
}
