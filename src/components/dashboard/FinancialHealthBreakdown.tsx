import { getHealthColor } from '@/lib/utils';
import { formatDecimal } from '@/lib/format';
import type { FinancialHealthDetails } from '@/types/dashboard';

interface FinancialHealthBreakdownProps {
  details: FinancialHealthDetails['details'] | undefined;
  /** Score is 0: show a hint instead of four zero pillars. */
  isEmpty: boolean;
}

/** The four pillars behind the financial health score, shared by the modal and the page. */
export default function FinancialHealthBreakdown({ details, isEmpty }: FinancialHealthBreakdownProps) {
  if (isEmpty) {
    return <p className="text-ui text-muted">Add transactions to see your score and breakdown.</p>;
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {PILLARS.map(({ key, label, description }) => {
        const value = details?.[key] ?? 0;
        return (
          <li key={key} className="rounded-panel border border-line bg-surface-0 p-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-heading font-semibold">{label}</span>
              <span className="text-copy font-semibold tabular-nums" style={{ color: getHealthColor(value) }}>
                {formatDecimal(value, { maxDecimals: 0 })}/100
              </span>
            </div>
            <p className="text-ui text-muted text-pretty">{description}</p>
          </li>
        );
      })}
    </ul>
  );
}

const PILLARS: { key: keyof FinancialHealthDetails['details']; label: string; description: string }[] = [
  { key: 'saving', label: 'Saving', description: 'Based on your all-time savings rate: (income − expenses) / income.' },
  { key: 'spendingControl', label: 'Spending control', description: 'Whether your all-time expenses stay within your all-time income.' },
  { key: 'goals', label: 'Goals', description: 'Share of your goals that are on track or completed.' },
  { key: 'engagement', label: 'Engagement', description: 'Recent activity (last 30 days), profile, goals, and share of categorized transactions across all time.' },
];
