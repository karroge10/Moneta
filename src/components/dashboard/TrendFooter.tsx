import TrendIndicator from '@/components/ui/TrendIndicator';

interface TrendFooterProps {
  trend: number;
  label: string;
  /** Previous period had no data, so a percentage would be meaningless. */
  skipped?: boolean;
  isExpense?: boolean;
}

/** Trend line under a figure, or a plain note when there is nothing to compare with yet. */
export default function TrendFooter({ trend, label, skipped = false, isExpense = false }: TrendFooterProps) {
  if (skipped) return <span className="text-helper">Not enough data to compare yet</span>;
  return <TrendIndicator value={trend} label={label} isExpense={isExpense} />;
}
