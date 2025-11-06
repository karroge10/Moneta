'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';
import ComingSoonBadge from '@/components/ui/ComingSoonBadge';
import ProgressBar from '@/components/ui/ProgressBar';
import { Goal } from '@/types/dashboard';
import { InfoCircle } from 'iconoir-react';

interface GoalsCardProps {
  goals: Goal[];
}

export default function GoalsCard({ goals }: GoalsCardProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  
  if (goals.length === 0) {
    return (
      <Card 
        title="Goals" 
        href="/goals"
        customHeader={
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-card-header">Goals</h2>
              <ComingSoonBadge />
            </div>
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

  return (
    <Card 
      title="Goals" 
      href="/goals"
      customHeader={
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-card-header">Goals</h2>
            <ComingSoonBadge />
          </div>
        </div>
      }
      showActions={false}
    >
      <div className="flex flex-col flex-1 mt-2">
        <div className="flex-1 min-h-0">
          <div className="text-helper mb-2">{goal.targetDate}</div>
          <div className="flex items-center justify-between mb-2 gap-2 min-w-0">
            <div className="text-body font-medium text-wrap-safe break-words min-w-0 flex-1">{goal.name}</div>
            <div className="text-body font-semibold flex-shrink-0 whitespace-nowrap">${goal.targetAmount.toLocaleString('en-US')}</div>
          </div>
          <div className="flex items-baseline gap-2 mb-4 min-w-0 flex-wrap">
            <span className="text-card-currency flex-shrink-0">$</span>
            <span className="text-card-value break-all min-w-0">{goal.currentAmount.toLocaleString('en-US')}</span>
          </div>
          <ProgressBar value={goal.progress} />
        </div>
        <div className="flex items-start gap-2 mt-4 text-sm min-w-0" style={{ color: 'var(--accent-purple)' }}>
          <InfoCircle width={18} height={18} strokeWidth={1.5} className="flex-shrink-0 mt-0.5" />
          <span className="text-wrap-safe break-words leading-tight">Save ${(goal.targetAmount - goal.currentAmount).toLocaleString('en-US')} more to reach your goal!</span>
        </div>
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

