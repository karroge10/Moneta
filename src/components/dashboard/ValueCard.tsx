'use client';

import { ReactNode } from 'react';

interface ValueCardProps {
  title: string;
  children: ReactNode;
  bottomRow: ReactNode;
}

/**
 * Shared card for dashboard value displays (Total, Estimated Tax, Average Monthly, etc.).
 * Same structure everywhere: title, value area, bottom description row.
 */
export default function ValueCard({ title, children, bottomRow }: ValueCardProps) {
  return (
    <div className="card-surface flex flex-col px-6 py-4 rounded-[30px] gap-3 h-full">
      <h2 className="text-card-header">{title}</h2>
      <div className="flex flex-col justify-center items-start flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {children}
        </div>
      </div>
      {bottomRow}
    </div>
  );
}
