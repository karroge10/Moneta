import { StatUp, StatDown } from 'iconoir-react';
import { getTrendColor, getExpenseTrendColor, formatPercentage } from '@/lib/utils';

interface TrendIndicatorProps {
  value: number;
  label: string;
  isExpense?: boolean; // If true, use inverted color logic (negative = good for expenses)
}

export default function TrendIndicator({ value, label, isExpense = false }: TrendIndicatorProps) {
  const color = isExpense ? getExpenseTrendColor(value) : getTrendColor(value);
  // For expenses: negative value means spending less (good), so show StatDown in green
  // For income: positive value means earning more (good), so show StatUp in green
  const Icon = isExpense 
    ? (value <= 0 ? StatDown : StatUp) // For expenses: negative/zero = good (down arrow green), positive = bad (up arrow red)
    : (value >= 0 ? StatUp : StatDown); // For income: positive = good (up arrow green), negative = bad (down arrow red)
  
  return (
    <div className="flex items-center gap-2">
      <Icon width={20} height={20} strokeWidth={1.5} style={{ color }} />
      <span>
        <span style={{ color, fontWeight: 600 }}>{formatPercentage(value, true)}</span>
        <span className="text-helper"> {label}</span>
      </span>
    </div>
  );
}

