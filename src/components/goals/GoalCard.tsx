'use client';

import { Goal } from '@/types/dashboard';
import ProgressBar from '@/components/ui/ProgressBar';
import { MoreHoriz } from 'iconoir-react';
import { getEncouragingMessage } from '@/lib/goalUtils';

interface GoalCardProps {
  goal: Goal;
  onOptionsClick?: () => void;
}

export default function GoalCard({ goal, onOptionsClick }: GoalCardProps) {
  const encouragingMessage = getEncouragingMessage(goal);

  return (
    <div 
      className="flex flex-col p-6"
      style={{ 
        backgroundColor: '#202020',
        borderRadius: '30px',
      }}
    >
      {/* Top row: Name, 3-dot menu */}
      <div className="flex items-center justify-between mb-4 gap-2">
        <h3 className="text-card-header flex-1 min-w-0 text-wrap-safe break-words">
          {goal.name}
        </h3>
        <button
          onClick={onOptionsClick}
          className="p-1 hover:opacity-70 transition-opacity cursor-pointer flex-shrink-0"
          aria-label="More options"
        >
          <MoreHoriz width={20} height={20} strokeWidth={1.5} style={{ color: '#E7E4E4' }} />
        </button>
      </div>

      {/* Second row: Deadline (left), Target amount (right) */}
      <div className="flex items-center justify-between mb-4 gap-2">
        <span className="text-helper">{goal.targetDate}</span>
        <div
          className="px-3 py-1 rounded-lg flex-shrink-0"
          style={{
            backgroundColor: '#282828',
            borderRadius: '10px',
            border: '1px solid rgba(231, 228, 228, 0.1)',
          }}
        >
          <span className="text-body font-semibold" style={{ color: 'var(--accent-purple)' }}>
            ${goal.targetAmount.toLocaleString('en-US')}
          </span>
        </div>
      </div>

      {/* Third row: Large current amount */}
      <div className="flex items-baseline gap-2 mb-4 min-w-0 flex-wrap">
        <span className="text-card-currency flex-shrink-0">$</span>
        <span className="text-card-value break-all min-w-0">
          {goal.currentAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>

      {/* Fourth row: Progress bar */}
      <div className="mb-4">
        <ProgressBar value={goal.progress} />
      </div>

      {/* Bottom row: Encouraging text (bottom-aligned) */}
      <div className="mt-auto pt-4 pb-0">
        <p className="text-sm leading-tight" style={{ color: 'var(--accent-purple)' }}>
          {encouragingMessage}
        </p>
      </div>
    </div>
  );
}

