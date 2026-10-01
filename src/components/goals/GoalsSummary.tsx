'use client';

import { Goal } from '@/types/dashboard';
import { calculateSummaryStats } from '@/lib/goalUtils';
import { Clock, CheckCircle, XmarkCircle, Trophy, Page, FireFlame, Timer, LotOfCash } from 'iconoir-react';
import Card from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';
import { cx } from '@/components/ui/cx';
import { formatMoney, formatPercent } from '@/lib/format';
import { useCurrency } from '@/hooks/useCurrency';

const SKELETON_ITEMS = [0, 1, 2, 3, 4, 5, 6, 7];

interface GoalsSummaryProps {
  goals: Goal[];
  compact?: boolean;
  loading?: boolean;
}

interface SummaryItem {
  label: string;
  value: string | number | null;
  icon: typeof Clock;
  /** Token classes for the icon circle; `color` is used instead for palette hues without a token. */
  toneClass?: string;
  color?: string;
}

export default function GoalsSummary({ goals, compact = false, loading = false }: GoalsSummaryProps) {
  const { currency } = useCurrency();
  const stats = calculateSummaryStats(goals);

  if (loading) {
    return (
      <Card title="Summary" className="h-full flex flex-col">
        <div className="mt-4 flex min-h-0 flex-1 flex-col gap-4" aria-busy="true">
          <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto pr-2">
            <div className="grid grid-cols-1 gap-3">
              {SKELETON_ITEMS.map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-card bg-surface-0 px-4 py-3">
                  <Skeleton className="size-12 shrink-0 rounded-full" />
                  <Skeleton className="h-4 max-w-[120px] flex-1" />
                  <Skeleton className="h-4 w-16 shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    );
  }

  const summaryItems: SummaryItem[] = [
    { label: 'Active Goals', value: stats.activeGoals, icon: Clock, color: '#4A90E2' },
    { label: 'Completed Goals', value: stats.completedGoals, icon: CheckCircle, toneClass: 'bg-positive/10 text-positive' },
    { label: 'Failed Goals', value: stats.failedGoals, icon: XmarkCircle, toneClass: 'bg-negative/10 text-negative-fg' },
    { label: 'Success Rate', value: formatPercent(stats.successRate, { decimals: 1 }), icon: Trophy, toneClass: 'bg-warning/10 text-warning' },
    { label: 'Total Goals', value: stats.totalGoals, icon: Page, toneClass: 'bg-accent/10 text-accent' },
    { label: 'Completions (Last 30d)', value: stats.completionsLast30d, icon: FireFlame, color: '#06B6D4' },
    { label: 'Avg Time to Complete', value: `${stats.averageTimeToComplete ?? 0} Days`, icon: Timer, toneClass: 'bg-accent/10 text-accent' },
    { label: 'Total Money Saved', value: formatMoney(stats.totalMoneySaved, currency.symbol), icon: LotOfCash, toneClass: 'bg-warning/10 text-warning' },
  ];

  return (
    <Card title="Summary" className="h-full flex flex-col">
      <div className="mt-4 flex min-h-0 flex-1 flex-col gap-4">
        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto pr-2">
          <ul className={cx('grid grid-cols-1 gap-3', compact && 'sm:grid-cols-2 xl:grid-cols-1')}>
            {summaryItems.map((item) => {
              const Icon = item.icon;
              const paletteStyle = item.color ? { backgroundColor: `${item.color}1a`, color: item.color } : undefined;
              return (
                <li key={item.label} className="flex w-full items-center gap-3 rounded-card bg-surface-0 px-4 py-3">
                  <div
                    className={cx(
                      'icon-circle shrink-0',
                      compact ? 'size-10 sm:size-11 xl:size-12' : 'size-12',
                      item.toneClass,
                    )}
                    style={paletteStyle}
                    aria-hidden="true"
                  >
                    <Icon width={compact ? 20 : 24} height={compact ? 20 : 24} strokeWidth={1.5} />
                  </div>
                  <span className="min-w-0 flex-1 text-body font-medium">{item.label}</span>
                  <span className="shrink-0 text-body font-semibold tabular-nums">{item.value}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </Card>
  );
}
