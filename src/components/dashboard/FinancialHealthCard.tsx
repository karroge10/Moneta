import Card from '@/components/ui/Card';
import { getHealthColor } from '@/lib/utils';
import { NavArrowRight } from 'iconoir-react';

interface FinancialHealthCardProps {
  score: number;
}

export default function FinancialHealthCard({ score }: FinancialHealthCardProps) {
  return (
    <div className="card-surface">
      <h2 className="text-card-header mb-4">Financial Health</h2>
      <div className="flex items-center justify-center" style={{ color: getHealthColor(score) }}>
        <span className="text-fin-health-key">{score}</span>
      </div>
      <div className="text-helper flex items-center gap-1 mt-6 cursor-pointer group hover-text-purple transition-colors">
        Learn how we calculate the financial health score <NavArrowRight width={14} height={14} className="stroke-current transition-colors" />
      </div>
    </div>
  );
}

