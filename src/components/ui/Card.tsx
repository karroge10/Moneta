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
  onAdd?: () => void;
}

export default function Card({
  title,
  children,
  showActions = true,
  customHeader,
  href,
  className = '',
  onAdd,
}: CardProps) {
  return (
    <div className={`card-surface flex flex-col ${className}`}>
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
              <button
                className="hover-text-purple transition-colors cursor-pointer group disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Add"
                type="button"
                onClick={onAdd}
                disabled={!onAdd}
              >
                <Plus width={20} height={20} strokeWidth={1.5} className="stroke-current" />
              </button>
              <button className="hover-text-purple transition-colors cursor-pointer group" aria-label="More options">
                <MoreHoriz width={20} height={20} strokeWidth={1.5} className="stroke-current" />
              </button>
            </div>
          )}
        </div>
      )}
      <div className="flex-1 flex flex-col">
        {children}
      </div>
    </div>
  );
}

