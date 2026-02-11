'use client';

import Card from '@/components/ui/Card';
import { Investment } from '@/types/dashboard';
import { getIcon } from '@/lib/iconMapping';
import { getTrendColor, formatNumber } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import { StatUp, StatDown } from 'iconoir-react';
import { NavArrowRight } from 'iconoir-react';
import { getAssetColor } from '@/lib/asset-utils';

import Link from 'next/link';

interface InvestmentsCardProps {
  investments: Investment[];
}

export default function InvestmentsCard({ investments }: InvestmentsCardProps) {
  const { currency } = useCurrency();
  
  if (investments.length === 0) {
    return (
      <Card 
        title="Investments" 
        href="/investments"
        customHeader={
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-card-header">Investments</h2>
            </div>
          </div>
        }
        showActions={false}
      >
        <div className="flex flex-col flex-1 mt-2 justify-center items-center py-8">
          <div className="text-body text-center mb-2 opacity-70">Add your first investment</div>
          <div className="text-helper text-center">Track stocks, crypto, and other assets</div>
        </div>
      </Card>
    );
  }

  return (
    <Card 
      title="Investments" 
      href="/investments"
      customHeader={
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-card-header">Investments</h2>
          </div>
        </div>
      }
      showActions={false}
    >
      <div className="flex flex-col flex-1 mt-2">
        <div className="space-y-4 flex-1">
          {investments.slice(0, 4).map((investment) => {
            const Icon = getIcon(investment.icon);
            const changePercent = investment.changePercent ?? 0;
            const isPositive = changePercent >= 0;
            const TrendIcon = isPositive ? StatUp : StatDown;
            const trendColor = getTrendColor(changePercent);
            
            return (
              <div key={investment.id} className="relative flex items-center gap-3 min-w-0">
                <div className="shrink-0">
                  <div
                    className="w-12 h-12 icon-circle"
                    style={{ backgroundColor: `${getAssetColor(investment.assetType)}1a` }}
                  >
                    <Icon width={24} height={24} strokeWidth={1.5} style={{ color: getAssetColor(investment.assetType) }} />
                  </div>
                </div>
                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="text-body font-medium text-wrap-safe">{investment.name}</div>
                  <div className="text-helper text-wrap-safe">{investment.subtitle}</div>
                </div>
                <div className="text-right shrink-0 ml-auto">
                  <div className="text-body font-semibold whitespace-nowrap">
                    {currency.symbol}{formatNumber(investment.currentValue)}
                  </div>
                  <div className="flex items-center gap-1 text-sm whitespace-nowrap" style={{ color: trendColor }}>
                    <TrendIcon width={14} height={14} strokeWidth={2} />
                    <span>{changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <Link 
          href="/investments" 
          className="text-helper flex items-center gap-1 mt-4 cursor-pointer group hover-text-purple transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          View All <NavArrowRight width={14} height={14} className="stroke-current transition-colors" />
        </Link>
      </div>
    </Card>
  );
}

