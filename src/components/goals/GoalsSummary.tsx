'use client';

import { Goal } from '@/types/dashboard';
import { calculateSummaryStats } from '@/lib/goalUtils';
import { Clock, CheckCircle, XmarkCircle, Trophy, Page, FireFlame, Timer, LotOfCash, MoreHoriz } from 'iconoir-react';
import Card from '@/components/ui/Card';
import { useCurrency } from '@/hooks/useCurrency';

const SKELETON_STYLE = { backgroundColor: '#3a3a3a' };
const SKELETON_ITEMS = 8;

interface GoalsSummaryProps {
  goals: Goal[];
  compact?: boolean;
  loading?: boolean;
}

interface SummaryItem {
  label: string;
  value: string | number | null;
  icon: typeof Clock;
  color: string;
}

export default function GoalsSummary({ goals, compact = false, loading = false }: GoalsSummaryProps) {
  const { currency } = useCurrency();
  const stats = calculateSummaryStats(goals);

  if (loading) {
    return (
      <Card
        title="Summary"
        className="h-full flex flex-col"
        customHeader={
          <div className="mb-4 flex items-center justify-between">
            <div className="h-6 w-24 rounded animate-pulse" style={SKELETON_STYLE} />
            <div className="w-8 h-8 rounded-full animate-pulse" style={SKELETON_STYLE} />
          </div>
        }
      >
        <div className="flex flex-col gap-4 mt-4 flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0 pr-2">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-1">
              {Array.from({ length: SKELETON_ITEMS }).map((_, idx) => (
                <div key={idx} className="flex items-center gap-3 px-4 py-3 rounded-[30px]" style={{ backgroundColor: '#202020' }}>
                  <div className="w-12 h-12 rounded-full shrink-0 animate-pulse" style={SKELETON_STYLE} />
                  <div className="h-4 flex-1 max-w-[120px] rounded animate-pulse" style={SKELETON_STYLE} />
                  <div className="h-4 w-16 rounded shrink-0 animate-pulse" style={SKELETON_STYLE} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // One unique color per item (no reuse) — palette stays within design system
  const summaryItems: SummaryItem[] = [
    { label: 'Active Goals', value: stats.activeGoals, icon: Clock, color: '#4A90E2' },
    { label: 'Completed Goals', value: stats.completedGoals, icon: CheckCircle, color: '#74C648' },
    { label: 'Failed Goals', value: stats.failedGoals, icon: XmarkCircle, color: '#D93F3F' },
    { label: 'Success Rate', value: `${stats.successRate.toFixed(1)}%`, icon: Trophy, color: '#FFA500' },
    { label: 'Total Goals', value: stats.totalGoals, icon: Page, color: '#AC66DA' },
    { label: 'Completions (Last 30d)', value: stats.completionsLast30d, icon: FireFlame, color: '#06B6D4' },
    { label: 'Avg Time to Complete', value: stats.averageTimeToComplete !== null ? `${stats.averageTimeToComplete} Days` : '0 Days', icon: Timer, color: '#8B5CF6' },
    { label: 'Total Money Saved', value: `${currency.symbol}${stats.totalMoneySaved.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: LotOfCash, color: '#F59E0B' },
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
        <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0 pr-2">
          <div
            className={`grid grid-cols-1 gap-3 ${
              compact ? 'sm:grid-cols-2 xl:grid-cols-1' : 'sm:grid-cols-1'
            }`}
          >
            {summaryItems.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="flex items-center gap-3 px-4 py-3"
                  style={{
                    backgroundColor: '#202020',
                    borderRadius: '30px',
                    width: '100%',
                  }}
                >
                  <div
                    className={`rounded-full flex items-center justify-center shrink-0 ${
                      compact ? 'w-10 h-10 sm:w-11 sm:h-11 xl:w-12 xl:h-12' : 'w-12 h-12'
                    }`}
                    style={{ backgroundColor: `${item.color}1a` }}
                  >
                    <Icon
                      width={compact ? 20 : 24}
                      height={compact ? 20 : 24}
                      strokeWidth={1.5}
                      style={{ color: item.color }}
                    />
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-body font-medium">{item.label}</span>
                  </div>
                  <span className="text-body font-semibold shrink-0">{item.value}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}

