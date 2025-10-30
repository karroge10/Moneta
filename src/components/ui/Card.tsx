import { ReactNode } from 'react';
import { Plus, MoreHoriz } from 'iconoir-react';

interface CardProps {
  title: string;
  children: ReactNode;
  showActions?: boolean;
  customHeader?: ReactNode;
}

export default function Card({ title, children, showActions = true, customHeader }: CardProps) {
  return (
    <div className="card-surface">
      {customHeader || (
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-card-header">{title}</h2>
          {showActions && (
            <div className="flex items-center gap-2">
              <button className="hover:text-accent-purple transition-colors" aria-label="Add">
                <Plus width={20} height={20} strokeWidth={1.5} />
              </button>
              <button className="hover:text-accent-purple transition-colors" aria-label="More options">
                <MoreHoriz width={20} height={20} strokeWidth={1.5} />
              </button>
            </div>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

