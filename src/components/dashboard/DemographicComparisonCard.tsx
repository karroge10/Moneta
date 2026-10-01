import { Neighbourhood } from 'iconoir-react';
import Card from '@/components/ui/Card';
import CardFooterLink from '@/components/dashboard/CardFooterLink';

interface DemographicComparisonCardProps {
  type: 'expense' | 'income';
  /** Data sharing is off, so there is nothing to compare against. */
  disabled: boolean;
}

/**
 * Points to the peer comparisons on Statistics. It deliberately shows no figure: the expenses and
 * income endpoints compare against a fixed regional constant, not real users, so a percentage here
 * would present made-up peer data as real. Statistics checks the cohort size before showing numbers.
 */
export default function DemographicComparisonCard({ type, disabled }: DemographicComparisonCardProps) {
  const subject = type === 'expense' ? 'spending' : 'income';

  return (
    <Card
      title="Demographic Comparison"
      customHeader={
        <div className="mb-4 flex items-center gap-3">
          <span className="icon-circle size-10 border border-line-subtle bg-accent/10" aria-hidden="true">
            <Neighbourhood width={20} height={20} className="text-accent" />
          </span>
          <h2 className="text-card-header">Demographic Comparison</h2>
        </div>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <p className="text-body text-wrap-safe mb-6 flex-1 break-words leading-relaxed text-secondary">
          {disabled
            ? 'Enable data sharing in Settings to see how you compare to others in your age group, country, or profession.'
            : `See how your ${subject} compares with people in your age group, country, or profession.`}
        </p>
        {disabled ? (
          <CardFooterLink href="/settings">Settings</CardFooterLink>
        ) : (
          <CardFooterLink href="/statistics">Statistics</CardFooterLink>
        )}
      </div>
    </Card>
  );
}
