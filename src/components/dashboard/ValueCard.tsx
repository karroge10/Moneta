'use client';

import type { ReactNode } from 'react';

interface ValueCardProps {
  title: string;
  children: ReactNode;
  bottomRow: ReactNode;
}

/** Card with a title, one centered figure and a footer row (trend, link or note). */
export default function ValueCard({ title, children, bottomRow }: ValueCardProps) {
  return (
    <div className="card-surface flex h-full flex-col gap-3 rounded-card px-6 py-4">
      <h2 className="text-card-header">{title}</h2>
      <div className="flex min-w-0 flex-1 flex-col items-start justify-center">
        <div className="flex flex-wrap items-center gap-2">{children}</div>
      </div>
      {bottomRow}
    </div>
  );
}
