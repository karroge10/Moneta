'use client';

import { Reports } from 'iconoir-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import Skeleton from '@/components/ui/Skeleton';
import { cx } from '@/components/ui/cx';
import type { Category, MonthlySummaryRow } from '@/types/dashboard';
import { formatDecimal, formatMoney } from '@/lib/format';
import { useCurrency } from '@/hooks/useCurrency';
import { useCategories } from '@/hooks/useCategories';
import NamedIcon from '@/components/dashboard/NamedIcon';

interface MonthlySummaryTableProps {
  data: MonthlySummaryRow[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

/** Last twelve months of income, expenses, savings and top category: a table from md up, cards below. */
export default function MonthlySummaryTable({ data, loading = false, error = null, onRetry }: MonthlySummaryTableProps) {
  const { currency } = useCurrency();
  const { categories } = useCategories();

  return (
    <Card title="Monthly Summary" showActions={false} className="flex min-h-0 flex-1 flex-col">
      <div className="mt-2 flex min-h-[288px] w-full min-w-0 flex-1 flex-col overflow-hidden rounded-panel border border-line bg-surface-0">
        {loading ? (
          <TableSkeleton />
        ) : error ? (
          <ErrorState message={error} onRetry={onRetry} className="flex-1" />
        ) : data.length === 0 ? (
          <EmptyState
            icon={<Reports width={24} height={24} strokeWidth={1.5} />}
            title="No months to show yet"
            description="Once you have income or expenses, this table lists the latest twelve months with savings and top spending category."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button href="/transactions">Add transactions</Button>
                <Button href="/transactions/import" variant="secondary">Import</Button>
              </div>
            }
            className="flex-1"
          />
        ) : (
          <>
            <div className="hidden min-h-0 flex-1 overflow-auto md:block">
              <MonthsTable rows={data} categories={categories} symbol={currency.symbol} />
            </div>
            <ul className="flex flex-1 flex-col gap-4 overflow-auto p-4 md:hidden">
              {data.map((row) => (
                <MonthCard key={row.month} row={row} categories={categories} symbol={currency.symbol} />
              ))}
            </ul>
          </>
        )}
      </div>
    </Card>
  );
}

interface RowProps {
  categories: Category[];
  symbol: string;
}

function MonthsTable({ rows, categories, symbol }: RowProps & { rows: MonthlySummaryRow[] }) {
  return (
    <table className="w-full min-w-[700px] text-ui">
      <thead className="sticky top-0 z-10 bg-surface-0">
        <tr className="text-left text-caption uppercase tracking-wide text-muted">
          <th scope="col" className="px-5 py-3 font-medium">Month</th>
          <th scope="col" className="px-5 py-3 text-right font-medium">Income</th>
          <th scope="col" className="px-5 py-3 text-right font-medium">Expenses</th>
          <th scope="col" className="px-5 py-3 text-right font-medium">Savings</th>
          <th scope="col" className="px-5 py-3 font-medium">Top Category</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.month} className="border-t border-line-subtle">
            <th scope="row" className="px-5 py-4 text-left font-normal">{row.month}</th>
            <td className="px-5 py-4 text-right tabular-nums">{formatMoney(row.income, symbol)}</td>
            <td className="px-5 py-4 text-right tabular-nums">{formatMoney(row.expenses, symbol)}</td>
            <td className="px-5 py-4 text-right tabular-nums">{formatMoney(row.savings, symbol)}</td>
            <td className="px-5 py-4">
              <TopCategory row={row} categories={categories} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function MonthCard({ row, categories, symbol }: RowProps & { row: MonthlySummaryRow }) {
  const saved = row.savings >= 0;
  return (
    <li className="rounded-panel border border-line bg-surface-1 p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="text-caption uppercase tracking-wider text-muted">Month</div>
          <div className="text-heading font-bold">{row.month}</div>
        </div>
        <span
          className={cx(
            'rounded-full px-3 py-1 text-caption font-bold uppercase tabular-nums',
            saved ? 'bg-positive/10 text-positive' : 'bg-negative/10 text-negative-fg',
          )}
        >
          {formatMoney(row.savings, symbol, { sign: 'exceptZero' })} {saved ? 'Saved' : 'Overspent'}
        </span>
      </div>
      <dl className="space-y-3 text-ui">
        <div className="flex items-center justify-between border-b border-line-subtle py-2">
          <dt className="text-secondary">Income</dt>
          <dd className="font-semibold tabular-nums">{formatMoney(row.income, symbol)}</dd>
        </div>
        <div className="flex items-center justify-between border-b border-line-subtle py-2">
          <dt className="text-secondary">Expenses</dt>
          <dd className="font-semibold tabular-nums">{formatMoney(row.expenses, symbol)}</dd>
        </div>
        <div className="flex items-center justify-between py-2">
          <dt className="text-secondary">Top Category</dt>
          <dd className="font-semibold">
            <TopCategory row={row} categories={categories} />
          </dd>
        </div>
      </dl>
    </li>
  );
}

function TopCategory({ row, categories }: { row: MonthlySummaryRow; categories: Category[] }) {
  const category = categories.find((c) => c.name === row.topCategory.name);
  const iconColor = category?.color ?? 'var(--color-fg)';
  return (
    <span className="flex items-center gap-2">
      <NamedIcon name={category?.icon ?? 'HelpCircle'} width={16} height={16} strokeWidth={1.5} style={{ color: iconColor, flexShrink: 0 }} />
      <span>
        {row.topCategory.name} <span className="tabular-nums">({formatDecimal(row.topCategory.percentage, { maxDecimals: 1 })}%)</span>
      </span>
    </span>
  );
}

function TableSkeleton() {
  return (
    <div className="flex flex-col gap-5 p-5" aria-busy="true">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="flex items-center gap-6">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  );
}
