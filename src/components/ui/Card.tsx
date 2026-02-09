import { ReactNode } from 'react';
import Link from 'next/link';

interface CardProps {
  title: string;
  children: ReactNode;
  showActions?: boolean;
  customHeader?: ReactNode;
  href?: string;
  className?: string;
  onAdd?: () => void;
  action?: ReactNode;
}

export default function Card({
  title,
  children,
  showActions = true,
  customHeader,
  href,
  className = '',
  onAdd,
  action,
}: CardProps) {
  return (
    <div className={`card-surface flex flex-col min-h-0 ${className}`}>
      {customHeader || (
        <div className="mb-4 flex items-center justify-between">
          {href ? (
            <Link href={href} className="hover-text-purple transition-colors cursor-pointer">
              <h2 className="text-card-header">{title}</h2>
            </Link>
          ) : (
            <h2 className="text-card-header">{title}</h2>
          )}
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="flex-1 flex flex-col min-h-0">
        {children}
      </div>
    </div>
  );
}

