'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { NavArrowRight } from 'iconoir-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import Skeleton from '@/components/ui/Skeleton';
import ChangeText from '@/components/statistics/ChangeText';
import MissingRatesNote from '@/components/dashboard/MissingRatesNote';
import type { StatisticsSummaryItem } from '@/types/dashboard';
import { formatMoney } from '@/lib/format';
import { useCurrency } from '@/hooks/useCurrency';
import NamedIcon from '@/components/dashboard/NamedIcon';

interface StatisticsSummaryProps {
  items: StatisticsSummaryItem[];
  /** Transactions left out of the totals because no exchange rate was found. */
  missingRates?: number;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  /** Opens the score explanation in a dialog; without it the link goes to /financial-health. */
  onFinancialHealthLearnClick?: () => void;
}

/** All-time totals, goals, portfolio and the financial health score, with the score highlighted. */
export default function StatisticsSummary({
  items,
  missingRates = 0,
  loading = false,
  error = null,
  onRetry,
  onFinancialHealthLearnClick,
}: StatisticsSummaryProps) {
  if (loading) {
    return (
      <SummaryCard>
        <SummarySkeleton />
      </SummaryCard>
    );
  }

  if (error) {
    return (
      <SummaryCard>
        <ErrorState message={error} onRetry={onRetry} className="min-h-[420px] flex-1" />
      </SummaryCard>
    );
  }

  if (items.length === 0) {
    return (
      <SummaryCard>
        <EmptyState
          title="No summary yet"
          description="Log income and expenses to unlock income and expense totals, trends, goals, portfolio balance, and your financial health score."
          action={<Button href="/transactions">Go to Transactions</Button>}
          className="min-h-[420px] flex-1"
        />
      </SummaryCard>
    );
  }

  const regularItems = items.filter((item) => !item.isLarge);
  const largeItem = items.find((item) => item.isLarge);
  const portfolioIndex = regularItems.findIndex((item) => item.label === 'Portfolio Balance');
  const splitAt = portfolioIndex >= 0 ? portfolioIndex + 1 : regularItems.length;
  const itemsBefore = regularItems.slice(0, splitAt);
  const itemsAfter = regularItems.slice(splitAt);

  return (
    <SummaryCard>
      <div className="custom-scrollbar mt-4 flex min-h-[420px] flex-1 flex-col gap-3 overflow-y-auto pr-2">
        <MissingRatesNote count={missingRates} />
        {itemsBefore.map((item) => (
          <SummaryRow key={item.id} item={item} />
        ))}
        {largeItem && <HealthHighlight item={largeItem} onLearnClick={onFinancialHealthLearnClick} />}
        {itemsAfter.map((item) => (
          <SummaryRow key={item.id} item={item} />
        ))}
      </div>
    </SummaryCard>
  );
}

function SummaryCard({ children }: { children: ReactNode }) {
  return (
    <Card title="Summary" className="flex h-full min-h-0 flex-1 flex-col" showActions={false}>
      {children}
    </Card>
  );
}

function SummaryRow({ item }: { item: StatisticsSummaryItem }) {
  const { currency } = useCurrency();
  const displayValue = typeof item.value === 'number' ? formatMoney(item.value, currency.symbol) : item.value;

  return (
    <div className="flex w-full items-center gap-3 rounded-card bg-surface-0 px-4 py-3">
      <IconBubble color={item.iconColor} size="md">
        <NamedIcon name={item.icon} width={24} height={24} strokeWidth={1.5} style={{ color: item.iconColor }} />
      </IconBubble>
      <div className="min-w-0 flex-1">
        <div className="text-wrap-safe break-words text-body font-medium">{item.label}</div>
        {item.change && (
          <div className="mt-1">
            <ChangeText change={item.change} invert={item.invertChangeColor} />
          </div>
        )}
      </div>
      <span className="shrink-0 text-body font-semibold tabular-nums">{displayValue}</span>
    </div>
  );
}

function HealthHighlight({ item, onLearnClick }: { item: StatisticsSummaryItem; onLearnClick?: () => void }) {
  const linkClass = 'text-helper flex flex-wrap items-center gap-1 text-left transition-colors hover-text-purple';
  const linkContent = (
    <>
      <span className="text-wrap-safe break-words">{item.link}</span>
      <NavArrowRight width={14} height={14} className="shrink-0 stroke-current" aria-hidden="true" />
    </>
  );

  return (
    <div className="mt-4 flex min-h-[200px] w-full flex-col items-center justify-center rounded-card bg-surface-0 p-6">
      <IconBubble color={item.iconColor} size="lg">
        <NamedIcon name={item.icon} width={32} height={32} strokeWidth={1.5} style={{ color: item.iconColor }} />
      </IconBubble>
      <h3 className="mb-4 mt-4 text-card-header">{item.label}</h3>
      <div className="mb-4 text-[clamp(48px,5vw,64px)] font-bold leading-[1.1] tabular-nums" style={{ color: item.iconColor }}>
        {item.value}
      </div>
      {item.change && <div className="text-helper mb-2">{item.change}</div>}
      {item.link &&
        (onLearnClick ? (
          <button type="button" onClick={onLearnClick} className={linkClass}>
            {linkContent}
          </button>
        ) : (
          <Link href="/financial-health" className={linkClass}>
            {linkContent}
          </Link>
        ))}
    </div>
  );
}

function IconBubble({ color, size, children }: { color: string; size: 'md' | 'lg'; children: ReactNode }) {
  return (
    <span
      className={`icon-circle shrink-0 border border-line-subtle ${size === 'lg' ? 'size-16' : 'size-12'}`}
      style={{ backgroundColor: `color-mix(in oklch, ${color} 10%, transparent)` }}
      aria-hidden="true"
    >
      {children}
    </span>
  );
}

function SummarySkeleton() {
  return (
    <div className="mt-4 flex min-h-[420px] flex-1 flex-col gap-3 pr-2" aria-busy="true">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-card bg-surface-0 px-4 py-3">
          <Skeleton className="size-12 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-4 w-14 shrink-0" />
        </div>
      ))}
      <div className="mt-4 flex min-h-[200px] flex-col items-center justify-center gap-4 rounded-card bg-surface-0 p-6">
        <Skeleton className="size-16 rounded-full" />
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-12 w-24" />
      </div>
    </div>
  );
}
