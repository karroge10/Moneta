import Card from '@/components/ui/Card';
import { getHealthColor } from '@/lib/utils';
import { NavArrowRight } from 'iconoir-react';

interface FinancialHealthCardProps {
  score: number;
}

export default function FinancialHealthCard({ score }: FinancialHealthCardProps) {
  return (
    <Card title="Financial Health" href="/financial-health" showActions={false}>
      <div className="flex flex-col flex-1">
        <div className="flex items-center gap-2 flex-1 justify-center">
          <span className="text-card-value" style={{ color: getHealthColor(score) }}>
            {score}
          </span>
        </div>
        <div className="text-helper flex items-center gap-2 cursor-pointer group hover-text-purple transition-colors whitespace-nowrap mt-2">
          <span style={{ width: 20, height: 20, display: 'inline-block' }}></span>
          <span>Learn how we calculate</span>
          <NavArrowRight width={14} height={14} className="stroke-current transition-colors" />
        </div>
      </div>
    </Card>
  );
}

