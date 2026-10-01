'use client';

import { StatDown, StatUp } from 'iconoir-react';
import AssetAvatar from './AssetAvatar';
import { isValuationMissing, type Holding } from '@/hooks/investments/types';
import { formatPercent, formatQuantity } from '@/lib/format';
import { formatSmartNumber } from '@/lib/utils';
import { cx } from '@/components/ui/cx';

interface PortfolioListProps {
  portfolio: Holding[];
  currency: { symbol: string };
  onAssetClick: (holding: Holding) => void;
}

/** Scrollable list of holdings: logo, name, quantity, value and unrealized change. */
export default function PortfolioList({ portfolio, currency, onAssetClick }: PortfolioListProps) {
  return (
    <div className="custom-scrollbar md:h-full md:overflow-y-auto md:pr-2">
      <ul className="space-y-2">
        {portfolio.map((holding) => (
          <li key={holding.id}>
            <HoldingRow holding={holding} currency={currency} onClick={() => onAssetClick(holding)} />
          </li>
        ))}
      </ul>
    </div>
  );
}

interface HoldingRowProps {
  holding: Holding;
  currency: { symbol: string };
  onClick: () => void;
}

function HoldingRow({ holding, currency, onClick }: HoldingRowProps) {
  const quantity = holding.quantity ?? 0;
  const unit = holding.ticker || (quantity === 1 ? 'Item' : 'Items');
  const missing = isValuationMissing(holding);

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-control border border-line bg-surface-0 p-3 text-left transition-colors hover:border-accent"
    >
      <AssetAvatar icon={holding.icon} assetType={holding.assetType} size={22} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-ui font-semibold transition-colors group-hover:text-accent-fg">{holding.name}</div>
        <div className="truncate text-caption uppercase tracking-wider text-muted tabular-nums">
          {formatQuantity(quantity)} {unit}
        </div>
      </div>
      <div className="shrink-0 text-right">
        {missing ? (
          <div className="text-caption font-semibold text-warning">Price unavailable</div>
        ) : (
          <>
            <div className="text-ui font-semibold tabular-nums">
              {currency.symbol}
              {formatSmartNumber(holding.currentValue || 0)}
            </div>
            <ChangeBadge percent={holding.changePercent || 0} />
          </>
        )}
      </div>
    </button>
  );
}

/** Signed percent with an arrow, so the direction is not carried by color alone. */
function ChangeBadge({ percent }: { percent: number }) {
  const up = percent >= 0;
  const Icon = up ? StatUp : StatDown;
  return (
    <div className={cx('flex items-center justify-end gap-1 text-caption font-semibold tabular-nums', up ? 'text-positive' : 'text-negative-fg')}>
      <Icon width={14} height={14} strokeWidth={2.5} aria-hidden="true" />
      {formatPercent(percent, { signed: true })}
    </div>
  );
}
