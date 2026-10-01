import { InfoCircle } from 'iconoir-react';
import { formatDecimal } from '@/lib/format';
import { cx } from '@/components/ui/cx';

interface MissingRatesNoteProps {
  /** Transactions left out of the totals because no exchange rate was found. Renders nothing at 0. */
  count: number;
  className?: string;
}

/** Small note under a total when some transactions could not be converted to the user's currency. */
export default function MissingRatesNote({ count, className }: MissingRatesNoteProps) {
  if (count <= 0) return null;
  const noun = count === 1 ? 'transaction' : 'transactions';
  return (
    <p className={cx('flex items-start gap-1.5 text-caption text-muted', className)}>
      <InfoCircle width={14} height={14} strokeWidth={1.5} className="mt-0.5 shrink-0" aria-hidden="true" />
      <span className="text-pretty">
        <span className="tabular-nums">{formatDecimal(count, { maxDecimals: 0 })}</span> {noun} not included: exchange rate unavailable
      </span>
    </p>
  );
}
