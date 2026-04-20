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
      <div className="mt-2 flex-1 flex flex-col min-h-[288px] w-full min-w-0 rounded-3xl border border-[#3a3a3a] overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>
        {/* Desktop Table View */}
        <div className="hidden md:block flex-1 min-h-0 overflow-auto">
          <table className="min-w-[700px]">
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

        {/* Mobile Card View */}
        <div className="md:hidden flex-1 flex flex-col p-4 gap-4 overflow-auto">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-4 rounded-2xl border border-[#3a3a3a] bg-background-secondary animate-pulse">
                <div className="flex justify-between mb-4">
                  <div className="h-6 w-24 rounded" style={SKELETON_STYLE} />
                  <div className="h-6 w-16 rounded" style={SKELETON_STYLE} />
                </div>
                <div className="space-y-3">
                  <div className="h-4 w-full rounded" style={SKELETON_STYLE} />
                  <div className="h-4 w-full rounded" style={SKELETON_STYLE} />
                </div>
              </div>
            ))
          ) : showError ? (
            <div className="py-8 text-center">
              <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>{error}</p>
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="px-4 py-2 rounded-full text-body font-semibold bg-[#E7E4E4] text-[#282828]"
                >
                  Try again
                </button>
              )}
            </div>
          ) : showEmpty ? (
            <div className="py-8 text-center px-4">
              <Reports width={40} height={40} className="mx-auto mb-4 opacity-50" />
              <p className="text-body font-medium mb-1">No months to show yet</p>
              <p className="text-sm text-secondary mb-4">Once you have data, this table lists the latest twelve months.</p>
              <div className="flex flex-col gap-2">
                <Link href="/transactions" className="px-4 py-2 rounded-full bg-[#AC66DA] text-white text-sm font-semibold">Add transactions</Link>
                <Link href="/transactions/import" className="px-4 py-2 rounded-full border border-[#3a3a3a] text-sm font-semibold text-white">Import</Link>
              </div>
            </div>
          ) : (
            data.map((row, index) => {
              const categoryObj = categories.find(c => c.name === row.topCategory.name);
              const CategoryIcon = categoryObj ? getIcon(categoryObj.icon) : getIcon('HelpCircle');
              const iconColor = categoryObj?.color ?? '#E7E4E4';

              return (
                <div key={index} className="p-4 rounded-2xl border border-[#3a3a3a] bg-background-secondary">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="text-helper uppercase tracking-wider text-secondary mb-0.5">Month</div>
                      <div className="text-lg font-bold">{row.month}</div>
                    </div>
                    <div className="px-3 py-1 rounded-full bg-[#74C648]/10 text-[#74C648] text-xs font-bold uppercase tracking-tight">
                      {currency.symbol} {formatNumber(row.savings)} Saved
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-[#2A2A2A]">
                      <span className="text-sm text-secondary">Income</span>
                      <span className="text-sm font-semibold text-[#74C648]">{currency.symbol} {formatNumber(row.income)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-[#2A2A2A]">
                      <span className="text-sm text-secondary">Expenses</span>
                      <span className="text-sm font-semibold text-[#D93F3F] text-opacity-90">{currency.symbol} {formatNumber(row.expenses)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-secondary">Top Category</span>
                      <div className="flex items-center gap-2">
                        <CategoryIcon width={16} height={16} style={{ color: iconColor }} />
                        <span className="text-sm font-semibold">{row.topCategory.name} ({row.topCategory.percentage}%)</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Card>
  );
}
