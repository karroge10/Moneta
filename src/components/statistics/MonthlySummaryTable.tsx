'use client';

import Link from 'next/link';
import Card from '@/components/ui/Card';
import { formatNumber } from '@/lib/utils';
import { MonthlySummaryRow } from '@/types/dashboard';
import { useCurrency } from '@/hooks/useCurrency';
import { NavArrowRight, Reports } from 'iconoir-react';
import { useCategories } from '@/hooks/useCategories';
import { getIcon } from '@/lib/iconMapping';

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
  const { categories } = useCategories();
  const isEmpty = !loading && !error && data.length === 0;
  const showEmpty = !loading && !error && isEmpty;
  const showError = !loading && !!error;

  return (
    <Card title="Monthly Summary" showActions={false}
      className="flex flex-col min-h-0 flex-1"
    >
      <div className="mt-2 flex-1 flex flex-col min-h-[288px] rounded-3xl border border-[#3a3a3a] overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="min-w-full">
            <thead className="sticky top-0 z-10" style={{ backgroundColor: 'var(--bg-primary)' }}>
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
                        style={{ backgroundColor: '#E7E4E4', color: '#282828' }}
                      >
                        Try again
                      </button>
                    )}
                  </td>
                </tr>
              ) : showEmpty ? (
                <tr>
                  <td colSpan={COL_COUNT} className="px-5 py-12 align-top">
                    <div className="flex flex-col items-center gap-4 text-center max-w-md mx-auto">
                      <Reports width={40} height={40} strokeWidth={1.5} style={{ color: 'var(--text-secondary)' }} />
                      <div>
                        <p className="text-body font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                          No months to show yet
                        </p>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                          Once you have income or expenses, this table lists the latest twelve months with savings and top spending category.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 justify-center">
                        <Link
                          href="/transactions"
                          className="inline-flex items-center gap-1 px-4 py-2 rounded-full text-body font-semibold transition-opacity hover:opacity-90"
                          style={{ backgroundColor: 'var(--accent-purple)', color: 'var(--text-primary)' }}
                        >
                          Add transactions
                          <NavArrowRight width={16} height={16} strokeWidth={1.5} />
                        </Link>
                        <Link
                          href="/transactions/import"
                          className="inline-flex items-center gap-1 px-4 py-2 rounded-full text-body font-semibold border border-[#3a3a3a] transition-opacity hover:opacity-90"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          Import
                          <NavArrowRight width={16} height={16} strokeWidth={1.5} />
                        </Link>
                      </div>
                    </div>
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
                      <div className="flex items-center gap-2">
                        {(() => {
                          const categoryObj = categories.find(c => c.name === row.topCategory.name);
                          const CategoryIcon = categoryObj ? getIcon(categoryObj.icon) : getIcon('HelpCircle');
                          const iconColor = categoryObj?.color ?? '#E7E4E4';
                          return (
                            <>
                              <CategoryIcon width={16} height={16} strokeWidth={1.5} style={{ color: iconColor, flexShrink: 0 }} />
                              <span className="text-sm">
                                {row.topCategory.name} ({row.topCategory.percentage}%)
                              </span>
                            </>
                          );
                        })()}
                      </div>
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
