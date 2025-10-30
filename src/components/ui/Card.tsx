import { ReactNode } from 'react';
import Link from 'next/link';
import { Plus, MoreHoriz } from 'iconoir-react';

interface CardProps {
  title: string;
  children: ReactNode;
  showActions?: boolean;
  customHeader?: ReactNode;
  href?: string;
  className?: string;
}

export default function Card({ title, children, showActions = true, customHeader, href, className = '' }: CardProps) {
  return (
    <div className={`card-surface ${className}`}>
      {customHeader || (
        <div className="mb-4 flex items-center justify-between">
          {href ? (
            <Link href={href} className="hover-text-purple transition-colors cursor-pointer">
              <h2 className="text-card-header">{title}</h2>
            </Link>
          ) : (
            <h2 className="text-card-header">{title}</h2>
          )}
          {showActions && (
            <div className="flex items-center gap-2">
              <button className="hover-text-purple transition-colors cursor-pointer group" aria-label="Add">
                <Plus width={20} height={20} strokeWidth={1.5} className="stroke-current" />
              </button>
              <button className="hover-text-purple transition-colors cursor-pointer group" aria-label="More options">
                <MoreHoriz width={20} height={20} strokeWidth={1.5} className="stroke-current" />
              </button>
            </div>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

