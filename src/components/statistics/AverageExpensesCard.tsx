'use client';

import Link from 'next/link';
import Card from '@/components/ui/Card';
import DonutChart from '@/components/ui/DonutChart';
import { formatNumber } from '@/lib/utils';
import { getIcon } from '@/lib/iconMapping';
import { useCurrency } from '@/hooks/useCurrency';
import { NavArrowRight, LotOfCash } from 'iconoir-react';

interface AverageExpense {
  id: string;
  name: string;
  amount: number;
  icon: string;
  color: string;
  percentage?: number;
}

const SKELETON_STYLE = { backgroundColor: '#3a3a3a' };
const SKELETON_ROWS = 10;
const CARD_MIN_HEIGHT = 380;
const DONUT_HEIGHT = 260;

interface AverageExpensesCardProps {
  expenses: AverageExpense[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export default function AverageExpensesCard({ expenses, loading = false, error = null, onRetry }: AverageExpensesCardProps) {
  const { currency } = useCurrency();
  const isEmpty = !loading && !error && expenses.length === 0;
  const showEmpty = !loading && !error && isEmpty;
  const showError = !loading && !!error;

  const chartData = [...expenses]
    .sort((a, b) => b.amount - a.amount)
    .map((e) => ({
    name: e.name,
    value: e.percentage ?? 0,
    color: e.color,
  }));

  return (
    <Card title="Expenses by Category" className="flex flex-col min-h-0 flex-1 h-full">
      <div
        className="mt-2 flex flex-col flex-1 min-h-0 overflow-visible"
        style={{
          minHeight: loading || (!showError && !showEmpty) ? CARD_MIN_HEIGHT : undefined,
        }}
      >
        {loading ? (
          <>
            <div className="w-full shrink-0 rounded-2xl flex items-center justify-center" style={{ height: DONUT_HEIGHT, backgroundColor: 'var(--bg-primary)' }}>
              <div className="w-32 h-32 rounded-full animate-pulse" style={SKELETON_STYLE} />
            </div>
            <div className="overflow-hidden mt-4 pr-2 flex-1 min-h-0">
              <div className="flex flex-col gap-3">
                {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 min-w-0 px-4 py-3 rounded-2xl"
                    style={{ backgroundColor: 'var(--bg-primary)' }}
                  >
                    <div className="w-10 h-10 rounded-full shrink-0 animate-pulse" style={SKELETON_STYLE} />
                    <div className="h-4 flex-1 max-w-[120px] rounded animate-pulse" style={SKELETON_STYLE} />
                    <div className="h-4 w-16 rounded animate-pulse shrink-0" style={SKELETON_STYLE} />
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : showError ? (
          <div className="flex flex-col flex-1 justify-center items-center py-8 min-h-[200px]">
            <p className="text-body text-center mb-2" style={{ color: 'var(--text-secondary)' }}>
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
          </div>
        ) : showEmpty ? (
          <div className="flex flex-col flex-1 justify-center items-center gap-4 py-8 px-4 min-h-[320px] text-center">
            <LotOfCash width={40} height={40} strokeWidth={1.5} style={{ color: 'var(--text-secondary)' }} />
            <div>
              <p className="text-body font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                No expense data yet
              </p>
              <p className="text-helper max-w-sm mx-auto" style={{ color: 'var(--text-secondary)' }}>
                Add categorized expenses to see a donut chart and share of spend by category (all-time).
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
        ) : (
          <>
            <div className="w-full shrink-0" style={{ height: DONUT_HEIGHT }}>
              <DonutChart data={chartData} />
            </div>
            <div className="overflow-y-auto custom-scrollbar mt-4 pr-2 flex-1 min-h-0">
              <div className="flex flex-col gap-3">
                {[...expenses]
                  .sort((a, b) => b.amount - a.amount)
                  .map((expense) => {
                  const Icon = getIcon(expense.icon);
                  const bgColor = `${expense.color}1a`;
                  return (
                    <div
                      key={expense.id}
                      className="flex items-center gap-3 min-w-0 px-4 py-3 rounded-2xl"
                      style={{ backgroundColor: 'var(--bg-primary)' }}
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                       style={{ 
                          backgroundColor: bgColor,
                          border: '1px solid rgba(231, 228, 228, 0.1)'
                        }}
                      >
                        <Icon
                          width={20}
                          height={20}
                          strokeWidth={1.5}
                          style={{ color: expense.color }}
                        />
                      </div>
                      <div className="flex-1 min-w-0 text-body font-medium text-wrap-safe break-words">
                        {expense.name}
                        {expense.percentage !== undefined && (
                          <span className="text-helper ml-2">({expense.percentage}%)</span>
                        )}
                      </div>
                      <div className="text-body font-semibold shrink-0 whitespace-nowrap">
                        {currency.symbol} {formatNumber(expense.amount)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
