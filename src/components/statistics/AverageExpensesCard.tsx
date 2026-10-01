'use client';

import { LotOfCash } from 'iconoir-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import Skeleton from '@/components/ui/Skeleton';
import { LazyDonutChart } from '@/components/dashboard/LazyCharts';
import { formatDecimal, formatMoney } from '@/lib/format';
import { useCurrency } from '@/hooks/useCurrency';
import NamedIcon from '@/components/dashboard/NamedIcon';

interface AverageExpense {
  id: string;
  name: string;
  amount: number;
  icon: string;
  color: string;
  percentage?: number;
}

interface AverageExpensesCardProps {
  expenses: AverageExpense[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

/** All-time spending by category: donut chart plus a scrollable list, largest first. */
export default function AverageExpensesCard({ expenses, loading = false, error = null, onRetry }: AverageExpensesCardProps) {
  const { currency } = useCurrency();
  const sorted = [...expenses].sort((a, b) => b.amount - a.amount);
  const chartData = sorted.map((e) => ({ name: e.name, value: e.percentage ?? 0, color: e.color }));

  return (
    <Card title="Expenses by Category" className="flex h-full min-h-0 flex-1 flex-col">
      {loading ? (
        <LoadingBody />
      ) : error ? (
        <ErrorState message={error} onRetry={onRetry} className="min-h-[200px] flex-1" />
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={<LotOfCash width={24} height={24} strokeWidth={1.5} />}
          title="No expense data yet"
          description="Add categorized expenses to see a donut chart and share of spend by category (all-time)."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button href="/transactions">Add transactions</Button>
              <Button href="/transactions/import" variant="secondary">Import</Button>
            </div>
          }
          className="min-h-[320px] flex-1"
        />
      ) : (
        <div className="mt-2 flex min-h-[380px] flex-1 flex-col">
          <div className="h-[260px] w-full shrink-0">
            <LazyDonutChart data={chartData} />
          </div>
          <ul className="custom-scrollbar mt-4 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-2">
            {sorted.map((expense) => {
              return (
                <li key={expense.id} className="flex min-w-0 items-center gap-3 rounded-panel bg-surface-0 px-4 py-3">
                  <span
                    className="icon-circle size-10 shrink-0 border border-line-subtle"
                    style={{ backgroundColor: `color-mix(in oklch, ${expense.color} 10%, transparent)` }}
                    aria-hidden="true"
                  >
                    <NamedIcon name={expense.icon} width={20} height={20} strokeWidth={1.5} style={{ color: expense.color }} />
                  </span>
                  <span className="text-wrap-safe min-w-0 flex-1 break-words text-body font-medium">
                    {expense.name}
                    {expense.percentage !== undefined && (
                      <span className="text-helper ml-2 tabular-nums">({formatDecimal(expense.percentage, { maxDecimals: 1 })}%)</span>
                    )}
                  </span>
                  <span className="shrink-0 whitespace-nowrap text-body font-semibold tabular-nums">
                    {formatMoney(expense.amount, currency.symbol)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Card>
  );
}

function LoadingBody() {
  return (
    <div className="mt-2 flex min-h-[380px] flex-1 flex-col" aria-busy="true">
      <div className="flex h-[260px] w-full shrink-0 items-center justify-center rounded-panel bg-surface-0">
        <Skeleton className="size-32 rounded-full" />
      </div>
      <div className="mt-4 flex min-h-0 flex-1 flex-col gap-3 overflow-hidden pr-2">
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className="flex min-w-0 items-center gap-3 rounded-panel bg-surface-0 px-4 py-3">
            <Skeleton className="size-10 shrink-0 rounded-full" />
            <Skeleton className="h-4 max-w-[120px] flex-1" />
            <Skeleton className="h-4 w-16 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
