'use client';

import { StatUp, StatDown } from 'iconoir-react';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import CardFooterLink from '@/components/dashboard/CardFooterLink';
import type { Investment } from '@/types/dashboard';
import { formatMoney, formatPercent } from '@/lib/format';
import { getAssetColor } from '@/lib/asset-utils';
import { useCurrency } from '@/hooks/useCurrency';
import NamedIcon from '@/components/dashboard/NamedIcon';

interface InvestmentsCardProps {
  investments: Investment[];
}

/** First few holdings with current value and unrealized change. */
export default function InvestmentsCard({ investments }: InvestmentsCardProps) {
  const { currency } = useCurrency();

  if (investments.length === 0) {
    return (
      <Card title="Investments" href="/investments" showActions={false}>
        <EmptyState title="Add your first investment" description="Track stocks, crypto, and other assets" className="flex-1" />
      </Card>
    );
  }

  return (
    <Card title="Investments" href="/investments" showActions={false}>
      <div className="mt-2 flex flex-1 flex-col">
        <ul className="flex-1 space-y-4">
          {investments.slice(0, 4).map((investment) => (
            <InvestmentRow key={investment.id} investment={investment} currencySymbol={currency.symbol} />
          ))}
        </ul>
        <CardFooterLink href="/investments" className="mt-4">View All</CardFooterLink>
      </div>
    </Card>
  );
}

function InvestmentRow({ investment, currencySymbol }: { investment: Investment; currencySymbol: string }) {
  const assetColor = getAssetColor(investment.assetType);
  const changePercent = investment.changePercent ?? 0;
  const isGain = changePercent >= 0;
  const TrendIcon = isGain ? StatUp : StatDown;

  return (
    <li className="flex min-w-0 items-start gap-3">
      <span
        className="icon-circle size-12 shrink-0"
        style={{ backgroundColor: `color-mix(in oklch, ${assetColor} 10%, transparent)` }}
        aria-hidden="true"
      >
        <NamedIcon name={investment.icon} width={24} height={24} strokeWidth={1.5} style={{ color: assetColor }} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="text-wrap-safe block text-body font-medium leading-tight">{investment.name}</span>
        <span className="text-helper text-wrap-safe block">{investment.subtitle}</span>
      </span>
      <span className="ml-auto shrink-0 text-right">
        <span className="block whitespace-nowrap text-body font-semibold tabular-nums">
          {formatMoney(investment.currentValue, currencySymbol)}
        </span>
        <span className={`flex items-center justify-end gap-1 whitespace-nowrap text-ui tabular-nums ${isGain ? 'text-positive' : 'text-negative-fg'}`}>
          <TrendIcon width={14} height={14} strokeWidth={2} aria-hidden="true" />
          {formatPercent(changePercent, { signed: true })}
        </span>
      </span>
    </li>
  );
}
