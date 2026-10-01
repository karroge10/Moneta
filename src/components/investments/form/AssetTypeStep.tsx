'use client';

import type { ComponentType, SVGProps } from 'react';
import { BitcoinCircle, Cash, Neighbourhood, ViewGrid } from 'iconoir-react';
import { cx } from '@/components/ui/cx';
import type { InvestmentAssetType } from '@/types/investments';

interface AssetTypeStepProps {
  value: InvestmentAssetType;
  onChange: (assetType: InvestmentAssetType) => void;
}

/** First wizard step: pick crypto, stock, property or other. */
export default function AssetTypeStep({ value, onChange }: AssetTypeStepProps) {
  return (
    <fieldset>
      <legend className="mb-2 text-ui font-medium text-secondary">Asset Type</legend>
      <div className="grid grid-cols-2 gap-3">
        {OPTIONS.map((option) => {
          const selected = value === option.id;
          const Icon = option.icon;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              aria-pressed={selected}
              className={cx(
                'flex min-h-11 items-center gap-3 rounded-control border p-3 text-left transition-colors',
                selected ? 'border-accent bg-accent/10' : 'border-line bg-surface-0 hover:border-line-strong',
              )}
            >
              <Icon width={20} height={20} strokeWidth={1.5} className={selected ? 'text-accent' : 'text-muted'} aria-hidden="true" />
              <span className={cx('text-ui font-medium', selected ? 'text-fg' : 'text-secondary')}>{option.label}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

const OPTIONS: Array<{ id: InvestmentAssetType; label: string; icon: ComponentType<SVGProps<SVGSVGElement>> }> = [
  { id: 'crypto', label: 'Crypto', icon: BitcoinCircle },
  { id: 'stock', label: 'Stock / ETF', icon: Cash },
  { id: 'property', label: 'Property', icon: Neighbourhood },
  { id: 'custom', label: 'Other', icon: ViewGrid },
];
