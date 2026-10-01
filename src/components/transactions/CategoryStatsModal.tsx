'use client';

import { useQuery } from '@tanstack/react-query';
import type { Category, Transaction } from '@/types/dashboard';
import Dialog from '@/components/ui/Dialog';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import Skeleton from '@/components/ui/Skeleton';
import { cx } from '@/components/ui/cx';
import CategoryIcon from '@/components/transactions/shared/CategoryIcon';
import { MissingRatesNote } from '@/components/transactions/list/TransactionsFooter';
import { useCurrency } from '@/hooks/useCurrency';
import { useAuthReadyForApi } from '@/hooks/useAuthReadyForApi';
import type { TransactionsListResponse } from '@/hooks/transactions/useTransactionsPage';
import { apiFetch } from '@/lib/api-client';
import { API, queryKeys } from '@/lib/query-keys';
import { formatDecimal, formatMoney, formatPercent } from '@/lib/format';

interface CategoryStatsModalProps {
  categories: Category[];
  timePeriod: string;
  onClose: () => void;
  /** When given (import preview), stats are computed from these instead of fetching. */
  transactions?: Transaction[];
}

interface CategoryStat {
  category: Category;
  total: number;
  count: number;
}

const STATS_PAGE_SIZE = 1000;

/** Income and expense totals per category, as bars with share of the total. */
export default function CategoryStatsModal({
  categories,
  timePeriod,
  onClose,
  transactions: providedTransactions,
}: CategoryStatsModalProps) {
  const { currency } = useCurrency();
  const authReady = useAuthReadyForApi();
  const filters = { page: 1, pageSize: STATS_PAGE_SIZE, timePeriod };

  const query = useQuery({
    queryKey: queryKeys.transactions.list(filters),
    queryFn: () => apiFetch<TransactionsListResponse>(API.transactions, { params: filters }),
    enabled: authReady && !providedTransactions,
  });

  if (!categories.length) return null;

  const transactions = providedTransactions ?? query.data?.transactions ?? [];
  const isLoading = !providedTransactions && query.isPending;
  const { incomeStats, expenseStats } = buildStats(transactions, categories);
  const missingRates = providedTransactions ? 0 : (query.data?.missingRates ?? 0);

  return (
    <Dialog open onClose={onClose} title="Category Statistics" size="xl">
      <StatsBody
        isLoading={isLoading}
        error={providedTransactions ? null : query.error}
        onRetry={() => query.refetch()}
        retrying={query.isFetching}
        incomeStats={incomeStats}
        expenseStats={expenseStats}
        currencySymbol={currency.symbol}
      />
      {missingRates > 0 && (
        <div className="mt-4">
          <MissingRatesNote count={missingRates} />
        </div>
      )}
    </Dialog>
  );
}

interface StatsBodyProps {
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
  retrying: boolean;
  incomeStats: CategoryStat[];
  expenseStats: CategoryStat[];
  currencySymbol: string;
}

function StatsBody({ isLoading, error, onRetry, retrying, incomeStats, expenseStats, currencySymbol }: StatsBodyProps) {
  if (isLoading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-20 w-full rounded-panel" />
        <Skeleton className="h-20 w-full rounded-panel" />
      </div>
    );
  }
  if (error) return <ErrorState message={error.message} onRetry={onRetry} retrying={retrying} />;
  if (incomeStats.length === 0 && expenseStats.length === 0) {
    return <EmptyState title="No category data available" />;
  }

  return (
    <div className="space-y-8">
      <StatsSection title="Incomes" kind="income" stats={incomeStats} currencySymbol={currencySymbol} />
      <StatsSection title="Expenses" kind="expense" stats={expenseStats} currencySymbol={currencySymbol} />
    </div>
  );
}

interface StatsSectionProps {
  title: string;
  kind: 'income' | 'expense';
  stats: CategoryStat[];
  currencySymbol: string;
}

function StatsSection({ title, kind, stats, currencySymbol }: StatsSectionProps) {
  if (stats.length === 0) return null;
  const sectionTotal = stats.reduce((sum, stat) => sum + stat.total, 0);
  const isIncome = kind === 'income';

  return (
    <section>
      <h3 className={cx('text-card-header mb-4', isIncome ? 'text-positive' : 'text-negative')}>{title}</h3>
      <ul className="space-y-4">
        {stats.map((stat) => (
          <StatRow
            key={`${kind}-${stat.category.id}`}
            stat={stat}
            share={sectionTotal > 0 ? (stat.total / sectionTotal) * 100 : 0}
            isIncome={isIncome}
            currencySymbol={currencySymbol}
          />
        ))}
      </ul>
    </section>
  );
}

interface StatRowProps {
  stat: CategoryStat;
  share: number;
  isIncome: boolean;
  currencySymbol: string;
}

function StatRow({ stat, share, isIncome, currencySymbol }: StatRowProps) {
  const amount = formatMoney(stat.total, currencySymbol, { sign: 'never' });
  const count = formatDecimal(stat.count);
  const barColor = stat.category.color || (isIncome ? 'var(--color-positive)' : 'var(--color-negative)');

  return (
    <li className="rounded-panel border border-line bg-surface-inset p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent/10">
            <CategoryIcon
              name={stat.category.icon}
              width={20}
              height={20}
              strokeWidth={1.5}
              style={{ color: stat.category.color || undefined }}
              aria-hidden="true"
            />
          </div>
          <div>
            <div className="text-body font-semibold">{stat.category.name}</div>
            <div className="text-helper text-caption tabular-nums">{count} transactions</div>
          </div>
        </div>
        <div className="text-right">
          <div className={cx('text-body font-semibold tabular-nums', isIncome ? 'text-positive' : 'text-negative-fg')}>
            {isIncome ? '+' : '-'}
            {amount}
          </div>
          <div className="text-helper text-caption tabular-nums">{formatPercent(share, { decimals: 1 })}</div>
        </div>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-1" aria-hidden="true">
        <div
          className="h-full rounded-full transition-[width]"
          style={{ backgroundColor: barColor, width: `${share}%` }}
        />
      </div>
    </li>
  );
}

function buildStats(transactions: Transaction[], categories: Category[]) {
  const income = new Map<string, CategoryStat>();
  const expense = new Map<string, CategoryStat>();

  for (const transaction of transactions) {
    if (!transaction.category) continue;
    const category = categories.find((c) => c.name === transaction.category);
    if (!category) continue;
    const bucket = transaction.amount >= 0 ? income : expense;
    const stat = bucket.get(category.id) ?? { category, total: 0, count: 0 };
    stat.total += Math.abs(transaction.amount);
    stat.count += 1;
    bucket.set(category.id, stat);
  }

  const byTotal = (a: CategoryStat, b: CategoryStat) => b.total - a.total;
  const incomeStats = [...income.values()].sort(byTotal);
  const expenseStats = [...expense.values()].sort(byTotal);
  return { incomeStats, expenseStats };
}
