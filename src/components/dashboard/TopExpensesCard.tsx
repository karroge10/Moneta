'use client';

import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import { LazyDonutChart } from '@/components/dashboard/LazyCharts';
import type { ExpenseCategory } from '@/types/dashboard';
import { formatDecimal, formatMoney } from '@/lib/format';
import { useCurrency } from '@/hooks/useCurrency';
import NamedIcon from '@/components/dashboard/NamedIcon';

interface TopExpensesCardProps {
  expenses: ExpenseCategory[];
  /** Categories listed under the chart; the chart shows all of them. */
  limit?: number;
}

/** Dashboard donut of spending by category with the largest few listed below. */
export default function TopExpensesCard({ expenses, limit = 3 }: TopExpensesCardProps) {
  const { currency } = useCurrency();

  if (expenses.length === 0) {
    return (
      <Card title="Top Expenses">
        <EmptyState
          title="Add transactions to see your spending"
          description="Your top expense categories will appear here"
          className="flex-1"
        />
      </Card>
    );
  }

  const chartData = expenses.map((expense) => ({ name: expense.name, value: expense.percentage, color: expense.color }));

  return (
    <Card title="Top Expenses">
      <div className="mt-2 flex min-h-0 flex-1 flex-col">
        <div className="h-[200px] w-full shrink-0 2xl:h-[280px]">
          <LazyDonutChart data={chartData} />
        </div>
        <ul className="mt-4 shrink-0 space-y-3">
          {expenses.slice(0, limit).map((expense) => {
            return (
              <li key={expense.id} className="flex min-w-0 items-start gap-3">
                <span className="mt-1.5 size-3 shrink-0 rounded-full" style={{ backgroundColor: expense.color }} aria-hidden="true" />
                <span className="icon-circle mt-0.5 size-10 shrink-0 bg-accent/10 text-fg" aria-hidden="true">
                  <NamedIcon name={expense.icon} width={20} height={20} strokeWidth={1.5} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="text-wrap-safe block break-words text-body font-medium">{expense.name}</span>
                  <span className="mt-0.5 block text-caption text-muted tabular-nums">
                    {formatDecimal(expense.percentage, { maxDecimals: 1 })}%
                  </span>
                </span>
                <span className="shrink-0 whitespace-nowrap text-body font-semibold tabular-nums">
                  {formatMoney(expense.amount, currency.symbol)}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </Card>
  );
}
