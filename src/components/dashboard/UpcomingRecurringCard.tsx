'use client';

import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import CardFooterLink from '@/components/dashboard/CardFooterLink';
import type { Bill } from '@/types/dashboard';
import { formatMoney } from '@/lib/format';
import { useCurrency } from '@/hooks/useCurrency';
import { cx } from '@/components/ui/cx';
import NamedIcon from '@/components/dashboard/NamedIcon';

interface UpcomingRecurringCardProps {
  title: string;
  items: Bill[];
  emptyTitle: string;
  emptyDescription: string;
  onItemClick?: (item: Bill) => void;
}

/** Next due recurring bills or incomes. Paused items stay listed with a "Paused" badge. */
export default function UpcomingRecurringCard({ title, items, emptyTitle, emptyDescription, onItemClick }: UpcomingRecurringCardProps) {
  const { currency } = useCurrency();

  if (items.length === 0) {
    return (
      <Card title={title} showActions={false}>
        <EmptyState title={emptyTitle} description={emptyDescription} className="flex-1" />
      </Card>
    );
  }

  return (
    <Card title={title} showActions={false}>
      <div className="mt-2 flex flex-1 flex-col">
        <ul className="flex-1 space-y-4">
          {items.map((item) => (
            <li key={item.id}>
              <UpcomingRow item={item} currencySymbol={currency.symbol} onClick={onItemClick} />
            </li>
          ))}
        </ul>
        <CardFooterLink href="/transactions?view=future" className="mt-4">View All</CardFooterLink>
      </div>
    </Card>
  );
}

function UpcomingRow({ item, currencySymbol, onClick }: { item: Bill; currencySymbol: string; onClick?: (item: Bill) => void }) {
  const paused = item.isActive === false;

  const content = (
    <>
      <span className="icon-circle size-12 shrink-0 bg-accent/10" aria-hidden="true">
        <NamedIcon name={item.icon} width={24} height={24} strokeWidth={1.5} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="text-wrap-safe block text-body font-medium leading-tight">{item.name}</span>
        <span className="text-helper mt-0.5 block">{item.date}</span>
      </span>
      <span className="flex shrink-0 items-center gap-2">
        {paused && (
          <span className="rounded-full bg-surface-3 px-2 py-0.5 text-caption font-medium text-secondary">Paused</span>
        )}
        <span className="whitespace-nowrap text-body font-semibold tabular-nums">{formatMoney(item.amount, currencySymbol)}</span>
      </span>
    </>
  );

  const rowClass = cx('flex w-full min-w-0 items-center gap-3 text-left', paused && 'opacity-70');

  if (!onClick) return <div className={rowClass}>{content}</div>;

  return (
    <button
      type="button"
      onClick={() => onClick(item)}
      className={cx(rowClass, 'rounded-control transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-accent')}
    >
      {content}
    </button>
  );
}
