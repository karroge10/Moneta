'use client';

import { formatDecimal } from '@/lib/format';
import { useCurrency } from '@/hooks/useCurrency';

interface MoneyFigureProps {
  amount: number;
  /** Short form for headline cards: no decimals from 1,000, "1.2M" from a million. */
  compact?: boolean;
}

/** Headline amount: dimmed currency symbol plus a large tabular figure in the user's currency. */
export default function MoneyFigure({ amount, compact = false }: MoneyFigureProps) {
  const { currency } = useCurrency();
  const value = compact ? formatCompact(amount) : formatDecimal(amount, { minDecimals: 2, maxDecimals: 2 });
  return (
    <>
      <span className="text-card-currency shrink-0 opacity-50">{currency.symbol}</span>
      <span className="text-card-value min-w-0 break-all tabular-nums">{value}</span>
    </>
  );
}

function formatCompact(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) return formatDecimal(amount, { compact: true, maxDecimals: 1 });
  return formatDecimal(amount, { minDecimals: 0, maxDecimals: abs < 1000 ? 2 : 0 });
}
