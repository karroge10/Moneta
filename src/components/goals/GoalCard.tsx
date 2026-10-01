'use client';

import { Goal } from '@/types/dashboard';
import ProgressBar from '@/components/ui/ProgressBar';
import { getEncouragingMessage, getGoalStatus } from '@/lib/goalUtils';
import { useCurrency } from '@/hooks/useCurrency';
import { CheckCircle, XmarkCircle } from 'iconoir-react';
import type { CurrencyOption } from '@/lib/currency-country-map';
import { formatDecimal } from '@/lib/format';

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
    <button
      type="button"
      onClick={onClick}
      className="flex w-full flex-col rounded-card bg-surface-0 p-6 text-left transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-accent"
    >
      <div className="mb-4 flex w-full items-center justify-between gap-2">
        <h3 className="text-card-header min-w-0 flex-1 break-words text-wrap-safe">{goal.name}</h3>
        {goalStatus === 'completed' && (
          <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-positive/30 bg-positive/10 px-3 py-1 text-positive">
            <CheckCircle width={14} height={14} strokeWidth={2} aria-hidden="true" />
            <span className="text-caption font-semibold">Completed</span>
          </span>
        )}
        {goalStatus === 'failed' && (
          <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-negative/30 bg-negative/10 px-3 py-1 text-negative-fg">
            <XmarkCircle width={14} height={14} strokeWidth={2} aria-hidden="true" />
            <span className="text-caption font-semibold">Failed</span>
          </span>
        )}
      </div>

      <div className="mb-4 flex w-full items-center justify-between gap-2">
        <span className="text-helper">{goal.targetDate}</span>
        <span className="shrink-0 rounded-control border border-fg/10 bg-surface-1 px-3 py-1 text-ui font-semibold tabular-nums text-accent-fg">
          {displayCurrency.symbol}
          {formatDecimal(goal.targetAmount, { maxDecimals: 2 })}
        </span>
      </div>

      <div className="mb-4 flex min-w-0 flex-wrap items-baseline gap-2">
        <span className="text-card-currency shrink-0">{displayCurrency.symbol}</span>
        <span className="text-card-value min-w-0 break-all tabular-nums">
          {formatDecimal(goal.currentAmount, { minDecimals: 2, maxDecimals: 2 })}
        </span>
      </div>

      <div className="mb-4 w-full">
        <ProgressBar value={goal.progress} />
      </div>

      <p className="mt-auto pt-4 text-ui leading-tight text-accent-fg">{encouragingMessage}</p>
    </button>
  );
}
