import { StatUp, StatDown } from 'iconoir-react';
import { getTrendColor, getExpenseTrendColor, formatPercentage } from '@/lib/utils';

interface TrendIndicatorProps {
  value: number;
  label: string;
  isExpense?: boolean; 
}

export default function TrendIndicator({ value: rawValue, label, isExpense = false }: TrendIndicatorProps) {
  // Changes that round to 0.00% count as no change, so they get the neutral color and no sign.
  const value = Math.abs(rawValue) < 0.005 ? 0 : rawValue;
  const color = trendColor(value, isExpense);
  
  
  const Icon = isExpense 
    ? (value <= 0 ? StatDown : StatUp) 
    : (value >= 0 ? StatUp : StatDown); 
  
  return (
    <div className="flex items-start gap-2">
      <Icon width={20} height={20} strokeWidth={1.5} style={{ color }} className="mt-[1px] shrink-0" />
      <span className="leading-tight">
        <span className="tabular-nums" style={{ color, fontWeight: 600 }}>{formatPercentage(value, true)}</span>
        <span className="text-helper"> {label}</span>
      </span>
    </div>
  );
}

/** Zero change is neutral; otherwise green for good and red for bad, flipped for expenses. */
function trendColor(value: number, isExpense: boolean): string {
  if (value === 0) return 'var(--color-muted)';
  return isExpense ? getExpenseTrendColor(value) : getTrendColor(value);
}
