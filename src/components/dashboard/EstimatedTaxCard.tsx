'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';
import { NavArrowRight } from 'iconoir-react';
import { formatNumber } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import Link from 'next/link';

interface EstimatedTaxCardProps {
  amount: number;
  isEnabled: boolean;
  onToggle?: (enabled: boolean) => void;
}

export default function EstimatedTaxCard({ amount, isEnabled, onToggle }: EstimatedTaxCardProps) {
  const { currency } = useCurrency();
  const [enabled, setEnabled] = useState(isEnabled);

  const handleToggle = () => {
    const newValue = !enabled;
    setEnabled(newValue);
    onToggle?.(newValue);
  };

  return (
    <Card 
      title="Estimated Tax"
      customHeader={
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-card-header">Estimated Tax</h2>
          <button
            onClick={handleToggle}
            className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${
              enabled ? 'bg-[var(--accent-purple)]' : 'bg-[rgba(231,228,228,0.3)]'
            }`}
            aria-label="Toggle tax estimation"
          >
            <div
              className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 ease-in-out ${
                enabled ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      }
    >
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex items-baseline gap-2 flex-1 min-w-0 flex-wrap mb-4">
          <span className="text-card-currency flex-shrink-0">{currency.symbol}</span>
          <span className="text-card-value break-all min-w-0">{formatNumber(amount)}</span>
        </div>
        <Link href="/settings" className="text-helper flex items-center gap-1 cursor-pointer group hover-text-purple transition-colors flex-wrap">
          <span className="text-wrap-safe break-words">Tax Settings</span> <NavArrowRight width={14} height={14} className="stroke-current transition-colors flex-shrink-0" />
        </Link>
      </div>
    </Card>
  );
}

