'use client';

import Card from '@/components/ui/Card';
import { formatNumber } from '@/lib/utils';

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
  // Minimal variant: like Income/Expense cards (for two-column layout)
  if (minimal) {
    return (
      <Card title="Insight">
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex items-center gap-2 flex-1">
            <span className="text-card-currency">$</span>
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
    return (
      <div className="card-surface flex flex-col px-6 py-4 rounded-[30px] gap-3 min-w-0">
        <div className="text-card-header mb-2">Insight</div>
        <div className="flex items-center justify-between gap-3 min-w-0">
          <div className="flex-1 min-w-0">
            <div className="text-helper text-truncate-safe">{message}</div>
          </div>
          <div className="flex-shrink-0 text-right">
            <div className="flex items-baseline gap-1 justify-end">
              <span className="text-card-currency">$</span>
              <span className="text-card-value">{formatNumber(amount)}</span>
            </div>
            <div className="text-helper" style={{ color: 'var(--accent-green)' }}>
              +${formatNumber(investmentAmount, false)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Full card variant
  return (
    <Card title="Insight">
      <div className="mt-2 flex flex-col flex-1 min-h-0">
        <div className="text-helper mb-4 text-wrap-safe break-words">{title}</div>
        <div className="flex items-baseline gap-2 mb-4 min-w-0 flex-wrap">
          <span className="text-card-currency flex-shrink-0">$</span>
          <span className="text-card-value break-all min-w-0">{formatNumber(amount)}</span>
        </div>
        <div className="text-helper mt-auto text-wrap-safe break-words">
          <span>{message}</span>
          <span className="font-semibold ml-1 whitespace-nowrap" style={{ color: 'var(--accent-green)', opacity: 1 }}>
            ${formatNumber(investmentAmount, false)}
          </span>
        </div>
      </div>
    </Card>
  );
}

