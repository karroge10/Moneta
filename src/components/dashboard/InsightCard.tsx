'use client';

import Card from '@/components/ui/Card';
import ComingSoonBadge from '@/components/ui/ComingSoonBadge';
import { formatNumber } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';

interface InsightCardProps {
  title: string;
  amount: number;
  message: string;
  investmentAmount: number;
  trend: number;
  shortRow?: boolean;
  minimal?: boolean;
}

export default function InsightCard({ title, amount, message, investmentAmount, trend, shortRow = false, minimal = false }: InsightCardProps) {
  const { currency } = useCurrency();
  // Empty state when amount is 0
  const isEmpty = amount === 0;

  // Minimal variant: like Income/Expense cards (for two-column layout)
  if (minimal) {
    if (isEmpty) {
      return (
        <Card 
          title="Insight"
          customHeader={
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-card-header">Insight</h2>
                <ComingSoonBadge />
              </div>
            </div>
          }
          showActions={false}
        >
          <div className="flex flex-col flex-1 min-h-0 justify-center items-center py-8">
            <div className="text-body text-center mb-2 opacity-70">Add transactions to see insights</div>
            <div className="text-helper text-center">Personalized insights will appear here</div>
          </div>
        </Card>
      );
    }

    return (
      <Card 
        title="Insight"
        customHeader={
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-card-header">Insight</h2>
              <ComingSoonBadge />
            </div>
          </div>
        }
        showActions={false}
      >
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex items-center gap-2 flex-1">
            <span className="text-card-currency">{currency.symbol}</span>
            <span className="text-card-value">{formatNumber(amount)}</span>
          </div>
          <div className="text-helper mt-2">
            Could be earned with round-up feature
          </div>
        </div>
      </Card>
    );
  }

  // Short row variant for tablet/mobile
  if (shortRow) {
    if (isEmpty) {
      return (
        <div className="card-surface flex flex-col px-6 py-4 rounded-[30px] gap-3 min-w-0">
          <div className="mb-2 flex items-center gap-3">
            <div className="text-card-header">Insight</div>
            <ComingSoonBadge />
          </div>
          <div className="flex flex-col justify-center items-center py-4">
            <div className="text-body text-center mb-2 opacity-70">Add transactions to see insights</div>
            <div className="text-helper text-center">Personalized insights will appear here</div>
          </div>
        </div>
      );
    }

    return (
      <div className="card-surface flex flex-col px-6 py-4 rounded-[30px] gap-3 min-w-0">
        <div className="mb-2 flex items-center gap-3">
          <div className="text-card-header">Insight</div>
          <ComingSoonBadge />
        </div>
        <div className="flex items-center justify-between gap-3 min-w-0">
          <div className="flex-1 min-w-0">
            <div className="text-helper text-truncate-safe">{message}</div>
          </div>
          <div className="flex-shrink-0 text-right">
            <div className="flex items-baseline gap-1 justify-end">
              <span className="text-card-currency">{currency.symbol}</span>
              <span className="text-card-value">{formatNumber(amount)}</span>
            </div>
            <div style={{ color: 'var(--accent-green)', fontSize: 'clamp(12px, 1.2vw, 14px)', fontWeight: 600 }}>
              +{currency.symbol}{formatNumber(investmentAmount, false)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Full card variant
  if (isEmpty) {
    return (
      <Card 
        title="Insight"
        customHeader={
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-card-header">Insight</h2>
              <ComingSoonBadge />
            </div>
          </div>
        }
        showActions={false}
      >
        <div className="mt-2 flex flex-col flex-1 min-h-0 justify-center items-center py-8">
          <div className="text-body text-center mb-2 opacity-70">Add transactions to see insights</div>
          <div className="text-helper text-center">Personalized insights will appear here</div>
        </div>
      </Card>
    );
  }

  return (
    <Card 
      title="Insight"
      customHeader={
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-card-header">Insight</h2>
            <ComingSoonBadge />
          </div>
        </div>
      }
      showActions={false}
    >
      <div className="mt-2 flex flex-col flex-1 min-h-0">
        <div className="text-helper mb-4 text-wrap-safe break-words">{title}</div>
        <div className="flex items-baseline gap-2 mb-4 min-w-0 flex-wrap">
          <span className="text-card-currency flex-shrink-0">{currency.symbol}</span>
          <span className="text-card-value break-all min-w-0">{formatNumber(amount)}</span>
        </div>
        <div className="mt-auto text-wrap-safe break-words">
          <span className="text-helper">{message}</span>
          <span className="font-semibold ml-1 whitespace-nowrap" style={{ color: 'var(--accent-green)', fontSize: 'clamp(12px, 1.2vw, 14px)' }}>
            {currency.symbol}{formatNumber(investmentAmount, false)}
          </span>
        </div>
      </div>
    </Card>
  );
}

