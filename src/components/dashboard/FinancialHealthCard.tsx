import Link from 'next/link';
import Card from '@/components/ui/Card';
import { getHealthColor } from '@/lib/utils';
import { NavArrowRight } from 'iconoir-react';

interface FinancialHealthCardProps {
  score: number;
  trend?: number;
  mobile?: boolean;
  minimal?: boolean;
  /** When provided, "Learn how we calculate" opens this callback (e.g. modal) instead of linking to /financial-health */
  onLearnClick?: () => void;
}


const learnLinkClass = 'text-helper flex items-center gap-1 cursor-pointer group hover-text-purple transition-colors';
const learnLinkClassDesktop = 'text-helper flex items-center gap-2 cursor-pointer group hover-text-purple transition-colors mt-2 min-w-0';

function LearnTrigger({
  onClick,
  className,
  compact = false,
}: { onClick?: () => void; className: string; compact?: boolean }) {
  const content = (
    <>
      <span className={compact ? '' : 'text-wrap-safe break-words leading-tight'}>Learn how we calculate financial health score</span>
      <NavArrowRight width={compact ? 12 : 14} height={compact ? 12 : 14} className="stroke-current transition-colors shrink-0" />
    </>
  );
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {content}
      </button>
    );
  }
  return <Link href="/financial-health" className={className}>{content}</Link>;
}


export default function FinancialHealthCard({ score, trend, mobile = false, minimal = false, onLearnClick }: FinancialHealthCardProps) {

  // Empty state when score is 0
  if (score === 0) {
    if (mobile) {
      return (
        <div className="card-surface flex flex-col px-6 py-4 rounded-[30px] gap-3 min-w-0">
          <div className="mb-2 flex items-center gap-3">
            <div className="text-card-header">Financial Health</div>
          </div>
          <div className="flex flex-col justify-center items-center py-4">
            <div className="text-body text-center mb-2 opacity-70">Add transactions to see your score</div>
            <div className="text-helper text-center">Your financial health score will appear here</div>
          </div>
        </div>
      );
    }

    if (minimal) {
      return (
        <Card
          title="Financial Health"
          href="/financial-health"
          showActions={false}
          customHeader={
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-card-header">Financial Health</h2>
            </div>
          }
        >
          <div className="flex flex-col flex-1 min-h-0 justify-center items-center py-8">
            <div className="text-body text-center mb-2 opacity-70">Add transactions to see your score</div>
            <div className="text-helper text-center">Your financial health score will appear here</div>
          </div>
        </Card>
      );
    }

    return (
      <Card
        title="Financial Health"
        href="/financial-health"
        showActions={false}
        customHeader={
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-card-header">Financial Health</h2>
          </div>
        }
      >
        <div className="flex flex-col flex-1 min-h-0 justify-center items-center py-8">
          <div className="text-body text-center mb-2 opacity-70">Add transactions to see your score</div>
          <div className="text-helper text-center">Your financial health score will appear here</div>
        </div>
      </Card>
    );
  }

  // Minimal variant: like Income/Expense cards (for two-column layout)
  if (minimal) {
    return (
      <Card
        title="Financial Health"
        href="/financial-health"
        showActions={false}
        customHeader={
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-card-header">Financial Health</h2>
          </div>
        }
      >
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex items-center gap-2 flex-1">
            <span className="text-card-value" style={{ color: getHealthColor(score) }}>
              {score}
            </span>
          </div>
          <LearnTrigger onClick={onLearnClick} className={`${learnLinkClass} mt-2`} compact />
        </div>
      </Card>
    );
  }

  // Mobile variant: short horizontal row
  if (mobile) {
    return (
      <div className="card-surface flex flex-col px-6 py-4 rounded-[30px] gap-3 min-w-0">
        <div className="mb-2 flex items-center gap-3">
          <div className="text-card-header">Financial Health</div>
        </div>
        <div className="flex items-center justify-between gap-3 min-w-0">
          <span className="text-card-value flex-shrink-0 whitespace-nowrap" style={{ color: getHealthColor(score) }}>
            {score}/100
          </span>
        </div>
        <LearnTrigger onClick={onLearnClick} className={learnLinkClass} compact />
      </div>
    );
  }

  // Desktop variant: full card
  return (
    <Card
      title="Financial Health"
      href="/financial-health"
      showActions={false}
      customHeader={
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-card-header">Financial Health</h2>
        </div>
      }
    >
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex items-center gap-2 flex-1 justify-center">
          <span className="text-fin-health-key" style={{ color: getHealthColor(score) }}>
            {score}
          </span>
        </div>
        <LearnTrigger onClick={onLearnClick} className={learnLinkClassDesktop} compact={false} />
      </div>
    </Card>
  );
}

