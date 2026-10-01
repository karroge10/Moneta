'use client';

import { useState } from 'react';
import { InfoCircle, CheckCircle, XmarkCircle } from 'iconoir-react';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import ProgressBar from '@/components/ui/ProgressBar';
import { cx } from '@/components/ui/cx';
import type { Goal } from '@/types/dashboard';
import type { CurrencyOption } from '@/lib/currency-country-map';
import { getGoalStatus } from '@/lib/goalUtils';
import { formatDecimal, formatMoney } from '@/lib/format';
import { useCurrency } from '@/hooks/useCurrency';

interface GoalsCardProps {
  goals: Goal[];
  currencyOptions?: CurrencyOption[];
  onGoalClick?: (goal: Goal) => void;
}

/** One goal at a time with dots to switch between goals. */
export default function GoalsCard({ goals, currencyOptions = [], onGoalClick }: GoalsCardProps) {
  const { currency: userCurrency } = useCurrency();
  const [activeIndex, setActiveIndex] = useState(0);

  if (goals.length === 0) {
    return (
      <Card title="Goals" href="/goals" showActions={false}>
        <EmptyState title="Add your first goal" description="Set a financial target to track your progress" className="flex-1" />
      </Card>
    );
  }

  const safeIndex = Math.min(activeIndex, goals.length - 1);
  const goal = goals[safeIndex];
  const goalStatus = getGoalStatus(goal);
  const goalCurrency = goal.currencyId != null ? currencyOptions.find((c) => c.id === goal.currencyId) : undefined;
  const symbol = (goalCurrency ?? userCurrency).symbol;
  const remaining = goal.targetAmount - goal.currentAmount;

  const body = (
    <>
      <span className="text-helper mb-2 block">{goal.targetDate}</span>
      <span className="mb-2 flex min-w-0 items-center justify-between gap-2">
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <span className="text-wrap-safe min-w-0 break-words text-body font-medium">{goal.name}</span>
          {goalStatus === 'completed' && <StatusBadge status="completed" />}
          {goalStatus === 'failed' && <StatusBadge status="failed" />}
        </span>
        <span className="shrink-0 rounded-control border border-line-subtle bg-surface-1 px-3 py-1 text-body font-semibold text-accent-fg tabular-nums">
          {symbol}
          {formatDecimal(goal.targetAmount, { maxDecimals: 2 })}
        </span>
      </span>
      <span className="mb-4 flex min-w-0 flex-wrap items-baseline gap-2">
        <span className="text-card-currency shrink-0 opacity-50">{symbol}</span>
        <span className="text-card-value min-w-0 break-all">{formatDecimal(goal.currentAmount, { minDecimals: 2, maxDecimals: 2 })}</span>
      </span>
      <ProgressBar value={goal.progress} />
    </>
  );

  return (
    <Card title="Goals" href="/goals" showActions={false}>
      <div className="mt-2 flex flex-1 flex-col">
        {onGoalClick ? (
          <button
            type="button"
            onClick={() => onGoalClick(goal)}
            aria-label={`Edit goal ${goal.name}`}
            className="block min-h-0 flex-1 rounded-control text-left transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-accent"
          >
            {body}
          </button>
        ) : (
          <div className="min-h-0 flex-1">{body}</div>
        )}

        {goal.progress < 100 && (
          <p className="mt-4 flex min-w-0 items-start gap-2 text-ui text-accent-fg">
            <InfoCircle width={18} height={18} strokeWidth={1.5} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span className="text-wrap-safe break-words leading-tight">
              Save <span className="tabular-nums">{formatMoney(remaining, symbol)}</span> more to reach your goal!
            </span>
          </p>
        )}
        {goals.length > 1 && (
          <div className="mt-4 flex items-center justify-center">
            {goals.map((g, idx) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setActiveIndex(idx)}
                aria-label={`View goal ${idx + 1} of ${goals.length}`}
                aria-current={idx === safeIndex ? 'true' : undefined}
                className="group flex h-10 items-center px-1"
              >
                <span
                  className={cx(
                    'block h-2 w-2 rounded-full transition-[width,background-color] group-hover:w-8',
                    idx === safeIndex ? 'bg-accent' : 'bg-secondary',
                  )}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

function StatusBadge({ status }: { status: 'completed' | 'failed' }) {
  const isCompleted = status === 'completed';
  const Icon = isCompleted ? CheckCircle : XmarkCircle;
  return (
    <span
      className={cx(
        'flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-caption font-semibold',
        isCompleted ? 'border-positive/30 bg-positive/10 text-positive' : 'border-negative/30 bg-negative/10 text-negative-fg',
      )}
    >
      <Icon width={12} height={12} strokeWidth={2} aria-hidden="true" />
      {isCompleted ? 'Completed' : 'Failed'}
    </span>
  );
}
