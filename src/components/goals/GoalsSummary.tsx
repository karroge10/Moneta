'use client';

import { Goal } from '@/types/dashboard';
import { calculateSummaryStats } from '@/lib/goalUtils';
import { Clock, CheckCircle, Xmark, Trophy, Page, FireFlame, Timer, LotOfCash, MoreHoriz } from 'iconoir-react';
import Card from '@/components/ui/Card';

interface GoalsSummaryProps {
  goals: Goal[];
}

interface SummaryItem {
  label: string;
  value: string | number;
  icon: typeof Clock;
}

export default function GoalsSummary({ goals }: GoalsSummaryProps) {
  const stats = calculateSummaryStats(goals);

  const summaryItems: SummaryItem[] = [
    { label: 'Active Goals', value: stats.activeGoals, icon: Clock },
    { label: 'Completed Goals', value: stats.completedGoals, icon: CheckCircle },
    { label: 'Failed Goals', value: stats.failedGoals, icon: Xmark },
    { label: 'Success Rate', value: `${stats.successRate.toFixed(1)}%`, icon: Trophy },
    { label: 'Total Goals', value: stats.totalGoals, icon: Page },
    { label: 'Longest Streak', value: `${stats.longestStreak} Days`, icon: FireFlame },
    { label: 'Average Time to Complete', value: `${stats.averageTimeToComplete} Days`, icon: Timer },
  ];

  return (
    <Card 
      title="Summary" 
      className="h-full flex flex-col"
      customHeader={
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-card-header">Summary</h2>
          <button
            className="p-1 hover:opacity-70 transition-opacity cursor-pointer"
            aria-label="More options"
          >
            <MoreHoriz width={20} height={20} strokeWidth={1.5} style={{ color: '#E7E4E4' }} />
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-4 mt-4 flex-1 min-h-0">
        <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0 space-y-3">
          {summaryItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="flex items-center gap-3 px-3 py-3"
                style={{
                  backgroundColor: '#202020',
                  borderRadius: '30px',
                  width: '100%',
                }}
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: 'rgba(163, 102, 203, 0.1)' }}
                >
                  <Icon
                    width={24}
                    height={24}
                    strokeWidth={1.5}
                    style={{ color: '#E7E4E4' }}
                  />
                </div>
                <span className="text-body font-medium flex-1">{item.label}</span>
                <span className="text-body font-semibold flex-shrink-0">{item.value}</span>
              </div>
            );
          })}
        </div>

        {/* Total Money Saved Card */}
        <div
          className="flex flex-col items-center justify-center p-6 mt-4"
          style={{
            backgroundColor: '#202020',
            borderRadius: '30px',
            width: '100%',
          }}
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
            style={{ backgroundColor: 'rgba(163, 102, 203, 0.1)' }}
          >
            <LotOfCash
              width={32}
              height={32}
              strokeWidth={1.5}
              style={{ color: '#E7E4E4' }}
            />
          </div>
          <h3 className="text-card-header mb-2">Total Money Saved</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-card-currency">$</span>
            <span className="text-card-value">
              {stats.totalMoneySaved.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}

