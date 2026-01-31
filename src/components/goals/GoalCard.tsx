'use client';

import { Goal } from '@/types/dashboard';
import ProgressBar from '@/components/ui/ProgressBar';
import { getEncouragingMessage, getGoalStatus } from '@/lib/goalUtils';
import { useCurrency } from '@/hooks/useCurrency';
import { CheckCircle, XmarkCircle } from 'iconoir-react';
import type { CurrencyOption } from '@/lib/currency-country-map';

interface GoalCardProps {
  goal: Goal;
  currencyOptions?: CurrencyOption[];
  onClick?: () => void;
}

export default function GoalCard({ goal, currencyOptions = [], onClick }: GoalCardProps) {
  const { currency: userCurrency } = useCurrency();
  const displayCurrency = goal.currencyId != null
    ? (currencyOptions.find((c) => c.id === goal.currencyId) ?? userCurrency)
    : userCurrency;
  const encouragingMessage = getEncouragingMessage(goal);
  const goalStatus = getGoalStatus(goal);

  return (
    <div 
      className="flex flex-col p-6 cursor-pointer transition-opacity hover:opacity-90"
      style={{ 
        backgroundColor: '#202020',
        borderRadius: '30px',
      }}
      onClick={onClick}
    >
      {/* Top row: Name and Status badge */}
      <div className="flex items-center justify-between mb-4 gap-2">
        <h3 className="text-card-header flex-1 min-w-0 text-wrap-safe break-words">
          {goal.name}
        </h3>
        {goalStatus === 'completed' && (
          <div
            className="flex items-center gap-1.5 px-3 py-1 rounded-full flex-shrink-0"
            style={{
              backgroundColor: 'rgba(116, 198, 72, 0.1)',
              border: '1px solid rgba(116, 198, 72, 0.3)',
            }}
          >
            <CheckCircle width={14} height={14} strokeWidth={2} style={{ color: '#74C648' }} />
            <span className="text-xs font-semibold" style={{ color: '#74C648' }}>
              Completed
            </span>
          </div>
        )}
        {goalStatus === 'failed' && (
          <div
            className="flex items-center gap-1.5 px-3 py-1 rounded-full flex-shrink-0"
            style={{
              backgroundColor: 'rgba(217, 63, 63, 0.1)',
              border: '1px solid rgba(217, 63, 63, 0.3)',
            }}
          >
            <XmarkCircle width={14} height={14} strokeWidth={2} style={{ color: '#D93F3F' }} />
            <span className="text-xs font-semibold" style={{ color: '#D93F3F' }}>
              Failed
            </span>
          </div>
        )}
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
            {displayCurrency.symbol}{goal.targetAmount.toLocaleString('en-US')}
          </span>
        </div>
      </div>

      {/* Third row: Large current amount */}
      <div className="flex items-baseline gap-2 mb-4 min-w-0 flex-wrap">
        <span className="text-card-currency flex-shrink-0">{displayCurrency.symbol}</span>
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

