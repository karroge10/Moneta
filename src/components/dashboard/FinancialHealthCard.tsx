import Card from '@/components/ui/Card';
import { getHealthColor } from '@/lib/utils';
import { NavArrowRight } from 'iconoir-react';

interface FinancialHealthCardProps {
  score: number;
  mobile?: boolean;
  minimal?: boolean;
}

export default function FinancialHealthCard({ score, mobile = false, minimal = false }: FinancialHealthCardProps) {
  // Empty state when score is 0
  if (score === 0) {
    if (mobile) {
      return (
        <div className="card-surface flex flex-col px-6 py-4 rounded-[30px] gap-3 min-w-0">
          <div className="text-card-header mb-2">Financial Health</div>
          <div className="flex flex-col justify-center items-center py-4">
            <div className="text-body text-center mb-2 opacity-70">Add transactions to see your score</div>
            <div className="text-helper text-center">Your financial health score will appear here</div>
          </div>
        </div>
      );
    }

    if (minimal) {
      return (
        <Card title="Financial Health" href="/financial-health" showActions={false}>
          <div className="flex flex-col flex-1 min-h-0 justify-center items-center py-8">
            <div className="text-body text-center mb-2 opacity-70">Add transactions to see your score</div>
            <div className="text-helper text-center">Your financial health score will appear here</div>
          </div>
        </Card>
      );
    }

    return (
      <Card title="Financial Health" href="/financial-health" showActions={false}>
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
      <Card title="Financial Health" href="/financial-health" showActions={false}>
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex items-center gap-2 flex-1">
            <span className="text-card-value" style={{ color: getHealthColor(score) }}>
              {score}
            </span>
          </div>
          <div className="text-helper flex items-center gap-1 cursor-pointer group hover-text-purple transition-colors mt-2">
            <span>Learn how we calculate financial health score</span>
            <NavArrowRight width={12} height={12} className="stroke-current transition-colors flex-shrink-0" />
          </div>
        </div>
      </Card>
    );
  }

  // Mobile variant: short horizontal row
  if (mobile) {
    return (
      <div className="card-surface flex flex-col px-6 py-4 rounded-[30px] gap-3 min-w-0">
        <div className="text-card-header mb-2">Financial Health</div>
        <div className="flex items-center justify-between gap-3 min-w-0">
          <span className="text-card-value flex-shrink-0 whitespace-nowrap" style={{ color: getHealthColor(score) }}>
            {score}/100
          </span>
        </div>
        <div className="text-helper flex items-center gap-1 cursor-pointer group hover-text-purple transition-colors">
          <span>Learn how we calculate financial health score</span>
          <NavArrowRight width={12} height={12} className="stroke-current transition-colors flex-shrink-0" />
        </div>
      </div>
    );
  }

  // Desktop variant: full card
  return (
    <Card title="Financial Health" href="/financial-health" showActions={false}>
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex items-center gap-2 flex-1 justify-center">
          <span className="text-fin-health-key" style={{ color: getHealthColor(score) }}>
            {score}
          </span>
        </div>
        <div className="text-helper flex items-center gap-2 cursor-pointer group hover-text-purple transition-colors mt-2 min-w-0">
          <span className="text-wrap-safe break-words leading-tight">Learn how we calculate financial health score</span>
          <NavArrowRight width={14} height={14} className="stroke-current transition-colors flex-shrink-0" />
        </div>
      </div>
    </Card>
  );
}

