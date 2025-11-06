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
    <div className="shrink-0 w-16 h-8">
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
  if (investments.length === 0) {
    return (
      <Card title="Investments" href="/investments">
        <div className="flex flex-col flex-1 mt-2 justify-center items-center py-8">
          <div className="text-body text-center mb-2 opacity-70">Add your first investment</div>
          <div className="text-helper text-center">Track stocks, crypto, and other assets</div>
        </div>
      </Card>
    );
  }

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
              <div key={investment.id} className="relative flex items-center gap-3 min-w-0">
                <div className="shrink-0">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(163, 102, 203, 0.1)' }}
                  >
                    <Icon width={24} height={24} strokeWidth={1.5} style={{ color: '#E7E4E4' }} />
                  </div>
                </div>
                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="text-body font-medium text-wrap-safe">{investment.name}</div>
                  <div className="text-helper text-wrap-safe">{investment.subtitle}</div>
                </div>
                <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none">
                  <MiniTrendGraph isPositive={isPositive} />
                </div>
                <div className="text-right shrink-0 ml-auto">
                  <div className="text-body font-semibold whitespace-nowrap">
                    ${formatNumber(investment.currentValue)}
                  </div>
                  <div className="flex items-center gap-1 text-sm whitespace-nowrap" style={{ color: trendColor }}>
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

