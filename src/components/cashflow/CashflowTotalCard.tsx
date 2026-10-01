import ValueCard from '@/components/dashboard/ValueCard';
import MoneyFigure from '@/components/dashboard/MoneyFigure';
import TrendFooter from '@/components/dashboard/TrendFooter';
import MissingRatesNote from '@/components/dashboard/MissingRatesNote';
import type { TrendFigure } from '@/hooks/useCashflowData';

interface CashflowTotalCardProps {
  total: TrendFigure;
  isExpense: boolean;
  trendLabel: string;
  missingRates: number;
}

/** Period total with its trend and, when some rows had no exchange rate, a note saying so. */
export default function CashflowTotalCard({ total, isExpense, trendLabel, missingRates }: CashflowTotalCardProps) {
  const bottomRow = (
    <div className="flex flex-col gap-2">
      <TrendFooter trend={total.trend} label={trendLabel} skipped={total.trendSkipped} isExpense={isExpense} />
      <MissingRatesNote count={missingRates} />
    </div>
  );

  return (
    <ValueCard title="Total" bottomRow={bottomRow}>
      <MoneyFigure amount={total.amount} />
    </ValueCard>
  );
}
