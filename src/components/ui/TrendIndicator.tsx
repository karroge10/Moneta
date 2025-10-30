import { StatUp, StatDown } from 'iconoir-react';
import { getTrendColor, formatPercentage } from '@/lib/utils';

interface TrendIndicatorProps {
  value: number;
  label: string;
}

export default function TrendIndicator({ value, label }: TrendIndicatorProps) {
  const color = getTrendColor(value);
  const Icon = value >= 0 ? StatUp : StatDown;
  
  return (
    <div className="flex items-center gap-2 mt-2">
      <Icon width={20} height={20} strokeWidth={1.5} style={{ color }} />
      <span className="text-helper">
        <span style={{ color, fontWeight: 600 }}>{formatPercentage(value, true)}</span> {label}
      </span>
    </div>
  );
}

