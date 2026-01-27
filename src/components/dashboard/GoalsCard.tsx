'use client';

import { useState } from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import ProgressBar from '@/components/ui/ProgressBar';
import { Goal } from '@/types/dashboard';
import { getGoalStatus } from '@/lib/goalUtils';
import { InfoCircle, CheckCircle, XmarkCircle } from 'iconoir-react';
import { useCurrency } from '@/hooks/useCurrency';

interface GoalsCardProps {
  goals: Goal[];
  onGoalClick?: (goal: Goal) => void;
}

export default function GoalsCard({ goals, onGoalClick }: GoalsCardProps) {
  const { currency } = useCurrency();
  const [activeIndex, setActiveIndex] = useState(0);
  
  if (goals.length === 0) {
    return (
      <Card 
        title="Goals" 
        href="/goals"
        customHeader={
          <div className="mb-4 flex items-center justify-between">
            <Link href="/goals" className="hover-text-purple transition-colors cursor-pointer">
              <h2 className="text-card-header">Goals</h2>
            </Link>
          </div>
        }
        showActions={false}
      >
        <div className="flex flex-col flex-1 mt-2 justify-center items-center py-8">
          <div className="text-body text-center mb-2 opacity-70">Add your first goal</div>
          <div className="text-helper text-center">Set a financial target to track your progress</div>
        </div>
      </Card>
    );
  }

  // Ensure activeIndex is within bounds
  const safeIndex = Math.min(activeIndex, goals.length - 1);
  const goal = goals[safeIndex];
  const goalStatus = getGoalStatus(goal);

  return (
    <Card 
      title="Goals" 
      href="/goals"
      customHeader={
        <div className="mb-4 flex items-center justify-between">
          <Link href="/goals" className="hover-text-purple transition-colors cursor-pointer">
            <h2 className="text-card-header">Goals</h2>
          </Link>
        </div>
      }
      showActions={false}
    >
      <div className="flex flex-col flex-1 mt-2">
        <div 
          className="flex-1 min-h-0 cursor-pointer transition-opacity hover:opacity-90"
          onClick={() => onGoalClick?.(goal)}
        >
          {/* Target date */}
          <div className="text-helper mb-2">{goal.targetDate}</div>
          
          {/* Goal name and target amount */}
          <div className="flex items-center justify-between mb-2 gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="text-body font-medium text-wrap-safe break-words min-w-0">{goal.name}</div>
              {goalStatus === 'completed' && (
                <div
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: 'rgba(116, 198, 72, 0.1)',
                    border: '1px solid rgba(116, 198, 72, 0.3)',
                  }}
                >
                  <CheckCircle width={12} height={12} strokeWidth={2} style={{ color: '#74C648' }} />
                  <span className="text-[10px] font-semibold" style={{ color: '#74C648' }}>
                    Completed
                  </span>
                </div>
              )}
              {goalStatus === 'failed' && (
                <div
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: 'rgba(217, 63, 63, 0.1)',
                    border: '1px solid rgba(217, 63, 63, 0.3)',
                  }}
                >
                  <XmarkCircle width={12} height={12} strokeWidth={2} style={{ color: '#D93F3F' }} />
                  <span className="text-[10px] font-semibold" style={{ color: '#D93F3F' }}>
                    Failed
                  </span>
                </div>
              )}
            </div>
            <div
              className="px-3 py-1 rounded-lg flex-shrink-0"
              style={{
                backgroundColor: '#282828',
                borderRadius: '10px',
                border: '1px solid rgba(231, 228, 228, 0.1)',
              }}
            >
              <span className="text-body font-semibold" style={{ color: 'var(--accent-purple)' }}>
                {currency.symbol}{goal.targetAmount.toLocaleString('en-US')}
              </span>
            </div>
          </div>
          
          {/* Current amount */}
          <div className="flex items-baseline gap-2 mb-4 min-w-0 flex-wrap">
            <span className="text-card-currency flex-shrink-0">{currency.symbol}</span>
            <span className="text-card-value break-all min-w-0">
              {goal.currentAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          
          {/* Progress bar */}
          <ProgressBar value={goal.progress} />
        </div>
        
        {/* Info message - only show if not completed */}
        {goal.progress < 100 && (
          <div className="flex items-start gap-2 mt-4 text-sm min-w-0" style={{ color: 'var(--accent-purple)' }}>
            <InfoCircle width={18} height={18} strokeWidth={1.5} className="flex-shrink-0 mt-0.5" />
            <span className="text-wrap-safe break-words leading-tight">
              Save {currency.symbol}{(goal.targetAmount - goal.currentAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} more to reach your goal!
            </span>
          </div>
        )}
        <div className="flex items-center justify-center gap-2 mt-6">
          {goals.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIndex(idx)}
              className="w-2 h-2 rounded-full transition-all cursor-pointer hover:w-8"
              style={{ backgroundColor: idx === activeIndex ? 'var(--accent-purple)' : 'var(--text-secondary)' }}
              aria-label={`View goal ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </Card>
  );
}

