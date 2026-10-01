import Link from 'next/link';
import { NavArrowRight } from 'iconoir-react';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import { getHealthColor } from '@/lib/utils';
import { formatDecimal } from '@/lib/format';
import { cx } from '@/components/ui/cx';

interface FinancialHealthCardProps {
  score: number;
  trend?: number;
  /** Smaller figure with "/100" for the phone layout. */
  mobile?: boolean;
  /** Smaller figure for the two-column tablet layout. */
  minimal?: boolean;
  /** Opens the explanation in a dialog; without it the link goes to /financial-health. */
  onLearnClick?: () => void;
}

export default function FinancialHealthCard({ score, mobile = false, minimal = false, onLearnClick }: FinancialHealthCardProps) {
  const href = mobile ? undefined : '/financial-health';

  if (score === 0) {
    return (
      <Card title="Financial Health" href={href} showActions={false}>
        <EmptyState title="Add transactions to see your score" description="Your financial health score will appear here" className="flex-1" />
      </Card>
    );
  }

  const compact = mobile || minimal;
  const scoreText = formatDecimal(score, { maxDecimals: 0 });

  return (
    <Card title="Financial Health" href={href} showActions={false}>
      <div className="flex min-h-0 flex-1 flex-col">
        <div className={cx('flex flex-1 items-center gap-2', !compact && 'justify-center')}>
          <span
            className={cx('tabular-nums', compact ? 'text-card-value whitespace-nowrap' : 'text-fin-health-key')}
            style={{ color: getHealthColor(score) }}
          >
            {scoreText}
            {mobile && '/100'}
          </span>
        </div>
        <LearnTrigger onClick={onLearnClick} compact={compact} />
      </div>
    </Card>
  );
}

function LearnTrigger({ onClick, compact }: { onClick?: () => void; compact: boolean }) {
  const className = cx(
    'text-helper mt-2 flex min-w-0 items-start text-left transition-colors hover-text-purple',
    compact ? 'gap-1' : 'gap-2',
  );
  const iconSize = compact ? 12 : 14;
  const content = (
    <>
      <span className="text-wrap-safe break-words leading-tight">Learn how we calculate financial health score</span>
      <NavArrowRight width={iconSize} height={iconSize} className="mt-0.5 shrink-0 stroke-current" aria-hidden="true" />
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {content}
      </button>
    );
  }
  return (
    <Link href="/financial-health" className={className}>
      {content}
    </Link>
  );
}
