'use client';

import ValueCard from '@/components/dashboard/ValueCard';
import MoneyFigure from '@/components/dashboard/MoneyFigure';
import CardFooterLink from '@/components/dashboard/CardFooterLink';

interface EstimatedTaxCardProps {
  taxRate: number | null;
  totalIncome: number;
}

/** Income times the tax rate from Settings; asks for the rate when it is not set. */
export default function EstimatedTaxCard({ taxRate, totalIncome }: EstimatedTaxCardProps) {
  const settingsLink = <CardFooterLink href="/settings">Tax Settings</CardFooterLink>;

  if (taxRate === null) {
    return (
      <ValueCard title="Estimated Tax" bottomRow={settingsLink}>
        <p className="text-body text-secondary">
          Configure your income tax rate in Settings to see estimated tax for the selected period.
        </p>
      </ValueCard>
    );
  }

  const estimatedAmount = totalIncome * (taxRate / 100);
  return (
    <ValueCard title="Estimated Tax" bottomRow={settingsLink}>
      <MoneyFigure amount={estimatedAmount} />
    </ValueCard>
  );
}
