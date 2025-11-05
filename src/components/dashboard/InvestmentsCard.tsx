import Card from '@/components/ui/Card';
import { Investment } from '@/types/dashboard';
import { getIcon } from '@/lib/iconMapping';
import { getTrendColor, formatNumber } from '@/lib/utils';
import { StatUp, StatDown } from 'iconoir-react';
import { NavArrowRight } from 'iconoir-react';

interface InvestmentsCardProps {
  investments: Investment[];
}

// Simple placeholder for mini trend graph
function MiniTrendGraph({ isPositive }: { isPositive: boolean }) {
  return (
    <div className="flex-shrink-0 w-16 h-8">
      <svg viewBox="0 0 60 30" className="w-full h-full">
        {isPositive ? (
          <polyline
            points="0,25 6,13 12,20 18,20 24,06 30,15 36,10 42,9 48,1 54,5"
            fill="none"
            stroke="var(--accent-green)"
            strokeWidth="2"
          />
        ) : (
          <polyline
            points="0,8 6,10 12,11 18,19 24,14 30,15 36,17 42,4 48,19 54,22"
            fill="none"
            stroke="var(--error)"
            strokeWidth="2"
          />
        )}
      </svg>
    </div>
  );
}

export default function InvestmentsCard({ investments }: InvestmentsCardProps) {
  return (
    <Card title="Investments" href="/investments">
      <div className="flex flex-col flex-1 mt-2">
        <div className="space-y-4 flex-1">
          {investments.map((investment) => {
            const Icon = getIcon(investment.icon);
            const isPositive = investment.changePercent >= 0;
            const TrendIcon = isPositive ? StatUp : StatDown;
            const trendColor = getTrendColor(investment.changePercent);
            
            return (
              <div key={investment.id} className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  <Icon width={24} height={24} strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-body font-medium">{investment.name}</div>
                  <div className="text-helper">{investment.subtitle}</div>
                </div>
                <MiniTrendGraph isPositive={isPositive} />
                <div className="text-right">
                  <div className="text-body font-semibold">
                    ${formatNumber(investment.currentValue)}
                  </div>
                  <div className="flex items-center gap-1 text-sm" style={{ color: trendColor }}>
                    <TrendIcon width={14} height={14} strokeWidth={2} />
                    <span>{investment.changePercent >= 0 ? '+' : ''}{investment.changePercent.toFixed(2)}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="text-helper flex items-center gap-1 mt-4 cursor-pointer group hover-text-purple transition-colors">
          Investments <NavArrowRight width={14} height={14} className="stroke-current transition-colors" />
        </div>
      </div>
    </Card>
  );
}

