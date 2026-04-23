import { StatUp, StatDown } from 'iconoir-react';
import { getTrendColor, getExpenseTrendColor, formatPercentage } from '@/lib/utils';

interface TrendIndicatorProps {
  value: number;
  label: string;
  isExpense?: boolean; 
}

export default function TrendIndicator({ value, label, isExpense = false }: TrendIndicatorProps) {
  const color = isExpense ? getExpenseTrendColor(value) : getTrendColor(value);
  
  
  const Icon = isExpense 
    ? (value <= 0 ? StatDown : StatUp) 
    : (value >= 0 ? StatUp : StatDown); 
  
  return (
    <div className="flex items-start gap-2">
      <Icon width={20} height={20} strokeWidth={1.5} style={{ color }} className="mt-[1px] shrink-0" />
      <span className="leading-tight">
        <span style={{ color, fontWeight: 600 }}>{formatPercentage(value, true)}</span>
        <span className="text-helper"> {label}</span>
      </span>
    </div>
  );
}

