'use client';

import Card from '@/components/ui/Card';
import { formatNumber } from '@/lib/utils';
import { MonthlySummaryRow } from '@/types/dashboard';
import ComingSoonBadge from '@/components/ui/ComingSoonBadge';
import { useCurrency } from '@/hooks/useCurrency';

const SKELETON_STYLE = { backgroundColor: '#3a3a3a' };
const SKELETON_ROW_COUNT = 5;
const COL_COUNT = 5;

interface MonthlySummaryTableProps {
  data: MonthlySummaryRow[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export default function MonthlySummaryTable({ data, loading = false, error = null, onRetry }: MonthlySummaryTableProps) {
  const { currency } = useCurrency();
  const isEmpty = !loading && !error && data.length === 0;
  const showComingSoon = !loading && !error && isEmpty;
  const showError = !loading && !!error;

  return (
    <Card
      title="Monthly Summary"
      customHeader={
        showComingSoon ? (
          <div className="mb-4 flex items-center gap-3">
            <h2 className="text-card-header">Monthly Summary</h2>
            <ComingSoonBadge />
          </div>
        ) : undefined
      }
      showActions={false}
      className="flex flex-col min-h-0 flex-1"
    >
      <div className="mt-2 flex-1 flex flex-col min-h-[288px] rounded-3xl border border-[#3a3a3a] overflow-hidden" style={{ backgroundColor: '#202020' }}>
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="min-w-full">
            <thead className="sticky top-0 z-10" style={{ backgroundColor: '#202020' }}>
              <tr className="text-left text-xs uppercase tracking-wide" style={{ color: '#9CA3AF' }}>
                <th className="px-5 py-3 align-top">Month</th>
                <th className="px-5 py-3 align-top">Income</th>
                <th className="px-5 py-3 align-top">Expenses</th>
                <th className="px-5 py-3 align-top">Savings</th>
                <th className="px-5 py-3 align-top">Top Category</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: SKELETON_ROW_COUNT }).map((_, i) =>
                  <tr key={i} className="border-t border-[#2A2A2A]">
                    <td className="px-5 py-4 align-top">
                      <div className="h-4 w-20 rounded animate-pulse" style={SKELETON_STYLE} />
                    </td>
                    <td className="px-5 py-4 align-top">
                      <div className="h-4 w-16 rounded animate-pulse" style={SKELETON_STYLE} />
                    </td>
                    <td className="px-5 py-4 align-top">
                      <div className="h-4 w-16 rounded animate-pulse" style={SKELETON_STYLE} />
                    </td>
                    <td className="px-5 py-4 align-top">
                      <div className="h-4 w-16 rounded animate-pulse" style={SKELETON_STYLE} />
                    </td>
                    <td className="px-5 py-4 align-top">
                      <div className="h-4 w-24 rounded animate-pulse" style={SKELETON_STYLE} />
                    </td>
                  </tr>
                )) : showError ? (
                <tr>
                  <td
                    colSpan={COL_COUNT}
                    className="px-5 py-12 text-center"
                  >
                    <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                      {error}
                    </p>
                    {onRetry && (
                      <button
                        type="button"
                        onClick={onRetry}
                        className="px-4 py-2 rounded-full text-body font-semibold cursor-pointer transition-opacity hover:opacity-90"
                        style={{ backgroundColor: 'var(--accent-purple)', color: 'var(--text-primary)' }}
                      >
                        Try again
                      </button>
                    )}
                  </td>
                </tr>
              ) : showComingSoon ? (
                <tr>
                  <td
                    colSpan={COL_COUNT}
                    className="px-5 py-12 text-center text-sm"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Add transactions to see monthly summaries.
                  </td>
                </tr>
              ) : (
                data.map((row, index) => (
                  <tr
                    key={index}
                    className="border-t border-[#2A2A2A] hover:opacity-80 transition-opacity"
                  >
                    <td className="px-5 py-4 align-top">
                      <span className="text-sm">{row.month}</span>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <span className="text-sm">{currency.symbol} {formatNumber(row.income)}</span>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <span className="text-sm">{currency.symbol} {formatNumber(row.expenses)}</span>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <span className="text-sm">{currency.symbol} {formatNumber(row.savings)}</span>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <span className="text-sm">
                        {row.topCategory.name} ({row.topCategory.percentage}%)
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
}
