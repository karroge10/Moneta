'use client';

import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import { LazyDonutChart } from '@/components/dashboard/LazyCharts';
import type { ExpenseCategory } from '@/types/dashboard';
import { formatMoney } from '@/lib/format';
import { useCurrency } from '@/hooks/useCurrency';
import NamedIcon from '@/components/dashboard/NamedIcon';

interface BreakdownCardProps {
  /** "Top Categories" on expenses, "Top Sources" on income. */
  title: string;
  items: ExpenseCategory[];
  emptyTitle: string;
  emptyDescription: string;
}

/** Donut chart plus a list of the largest categories or income sources. */
export default function BreakdownCard({ title, items, emptyTitle, emptyDescription }: BreakdownCardProps) {
  const { currency } = useCurrency();

  if (items.length === 0) {
    return (
      <Card title={title}>
        <EmptyState title={emptyTitle} description={emptyDescription} className="flex-1" />
      </Card>
    );
  }

  const chartData = items.map((item) => ({ name: item.name, value: item.percentage, color: item.color }));

  return (
    <Card title={title}>
      <div className="mt-2 flex flex-1 flex-col">
        <div className="h-[200px] w-full 2xl:h-[280px]">
          <LazyDonutChart data={chartData} />
        </div>
        <ul className="mt-4 flex-1 space-y-3">
          {items.map((item) => {
            return (
              <li key={item.id} className="flex min-w-0 items-center gap-3">
                <span
                  className="icon-circle size-12 shrink-0"
                  style={{ backgroundColor: `color-mix(in oklch, ${item.color} 10%, transparent)` }}
                  aria-hidden="true"
                >
                  <NamedIcon name={item.icon} width={24} height={24} strokeWidth={1.5} style={{ color: item.color }} />
                </span>
                <span className="text-wrap-safe min-w-0 flex-1 break-words text-body font-medium">{item.name}</span>
                <span className="shrink-0 whitespace-nowrap text-body font-semibold tabular-nums">
                  {formatMoney(item.amount, currency.symbol)}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </Card>
  );
}
