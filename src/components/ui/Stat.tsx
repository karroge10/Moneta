import type { ReactNode } from 'react';
import TrendIndicator from '@/components/ui/TrendIndicator';
import { cx } from '@/components/ui/cx';

export interface StatTrend {
  /** Change in percent units (5 = +5%). Rendered with a sign and an up/down arrow, never color alone. */
  value: number;
  /** Comparison text, e.g. "vs last month". */
  label: string;
  /** For spending: a rise is bad, so colors flip (arrow and sign still follow the real direction). */
  isExpense?: boolean;
}

export interface StatProps {
  label: ReactNode;
  /** Already formatted figure, e.g. formatMoney(total, currency.alias). */
  value: ReactNode;
  trend?: StatTrend;
  /** Small text under the value. */
  hint?: ReactNode;
  /** md: 24px value for dense grids; lg: fluid 24 to 48px headline (.text-card-value). */
  size?: 'md' | 'lg';
  className?: string;
}

/** Label, big tabular figure and optional trend. Use inside Card or a grid of KPIs. */
export default function Stat({ label, value, trend, hint, size = 'lg', className }: StatProps) {
  return (
    <div className={cx('flex min-w-0 flex-col gap-1', className)}>
      <span className="text-ui text-secondary">{label}</span>
      <span
        className={cx(
          'truncate font-bold tabular-nums text-fg',
          size === 'lg' ? 'text-card-value' : 'text-2xl leading-tight',
        )}
      >
        {value}
      </span>
      {hint && <span className="text-caption text-muted">{hint}</span>}
      {trend && (
        <div className="mt-1 text-ui">
          <TrendIndicator value={trend.value} label={trend.label} isExpense={trend.isExpense} />
        </div>
      )}
    </div>
  );
}
