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
        </div>
      )}
      <div className="flex-1 flex flex-col">
        {children}
      </div>
    </div>
  );
}

