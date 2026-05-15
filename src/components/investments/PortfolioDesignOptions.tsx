'use client';

import { Investment } from '@/types/dashboard';
import AssetLogo from './AssetLogo';
import { StatUp, StatDown } from 'iconoir-react';
import { getAssetColor } from '@/lib/asset-utils';
import { formatSmartNumber } from '@/lib/utils';

interface PortfolioDesignProps {
  portfolio: Investment[];
  currency: { symbol: string };
  onAssetClick: (investment: Investment) => void;
}

export function CompactListDesign({ portfolio, currency, onAssetClick }: PortfolioDesignProps) {
  return (
    <div className="h-full overflow-y-auto pr-2 custom-scrollbar">
      <div className="space-y-2">
        {portfolio.map((item) => (
          <div
            key={item.id}
            onClick={() => onAssetClick(item)}
            className="flex items-center gap-3 p-3 bg-background rounded-xl border border-[#3a3a3a] cursor-pointer hover:border-[#AC66DA] transition-colors group"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div
                className="w-10 h-10 icon-circle flex-shrink-0"
                style={{ backgroundColor: `${getAssetColor(item.assetType)}1a` }}
              >
                <AssetLogo
                  src={item.icon}
                  size={22}
                  className="text-current"
                  style={{ color: getAssetColor(item.assetType) }}
                  fallback={
                    item.assetType === 'crypto'
                      ? 'BitcoinCircle'
                      : item.assetType === 'stock'
                        ? 'Cash'
                        : item.assetType === 'property'
                          ? 'Neighbourhood'
                          : 'Reports'
                  }
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-body font-semibold truncate group-hover:text-[#AC66DA] transition-colors">{item.name}</div>
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-helper uppercase tracking-wider shrink-0">
                    {item.quantity ? formatSmartNumber(item.quantity) : '0'}{' '}
                    {item.ticker || (item.quantity === 1 ? 'Item' : 'Items')}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right flex-shrink-0">
              <div className="text-body font-semibold tabular-nums">
                {currency.symbol}
                {formatSmartNumber(item.currentValue || 0)}
              </div>
              <div
                className={`text-helper font-semibold flex items-center justify-end gap-1 ${
                  (item.changePercent || 0) >= 0 ? 'text-[#74C648]' : 'text-[#D93F3F]'
                }`}
              >
                {(item.changePercent || 0) >= 0 ? (
                  <StatUp width={14} height={14} strokeWidth={2.5} />
                ) : (
                  <StatDown width={14} height={14} strokeWidth={2.5} />
                )}
                {Math.abs(item.changePercent || 0).toFixed(2)}%
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
