'use client';

import { NavArrowRight } from 'iconoir-react';
import { formatNumber } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import Link from 'next/link';
import ValueCard from '@/components/dashboard/ValueCard';

interface EstimatedTaxCardProps {
  taxRate: number | null;
  totalIncome: number;
}

const taxSettingsLink = (
  <Link
    href="/settings"
    className="text-helper flex items-center gap-1 cursor-pointer group hover:text-purple transition-colors flex-wrap w-fit"
  >
    <span className="text-wrap-safe wrap-break-word">Tax Settings</span>{' '}
    <NavArrowRight
      width={14}
      height={14}
      className="stroke-current transition-colors shrink-0"
    />
  </Link>
);

export default function EstimatedTaxCard({ taxRate, totalIncome }: EstimatedTaxCardProps) {
  const { currency } = useCurrency();
  const estimatedAmount = taxRate !== null ? totalIncome * (taxRate / 100) : 0;

  if (taxRate === null) {
    return (
      <ValueCard
        title="Estimated Tax"
        bottomRow={taxSettingsLink}
      >
        <p className="text-body" style={{ color: 'rgba(231, 228, 228, 0.7)' }}>
          Configure your income tax rate in Settings to see estimated tax for the selected period.
        </p>
      </ValueCard>
    );
  }

  return (
    <ValueCard title="Estimated Tax" bottomRow={taxSettingsLink}>
      <span className="text-card-currency shrink-0">{currency.symbol}</span>
      <span className="text-card-value break-all min-w-0">{formatNumber(estimatedAmount)}</span>
    </ValueCard>
  );
}
