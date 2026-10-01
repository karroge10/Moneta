'use client';

import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import TransactionRow from '@/components/dashboard/TransactionRow';
import CardFooterLink from '@/components/dashboard/CardFooterLink';
import type { Transaction } from '@/types/dashboard';

interface LatestTransactionsCardProps {
  title: string;
  transactions: Transaction[];
  emptyTitle: string;
  emptyDescription: string;
  onItemClick?: (transaction: Transaction) => void;
  /** Rows to show before "View All". */
  limit?: number;
}

/** Latest expenses, latest incomes or the dashboard's mixed list. */
export default function LatestTransactionsCard({
  title,
  transactions,
  emptyTitle,
  emptyDescription,
  onItemClick,
  limit = 6,
}: LatestTransactionsCardProps) {
  if (transactions.length === 0) {
    return (
      <Card title={title} href="/transactions">
        <EmptyState title={emptyTitle} description={emptyDescription} className="flex-1" />
      </Card>
    );
  }

  return (
    <Card title={title} href="/transactions">
      <div className="mt-2 flex flex-1 flex-col">
        <ul className="flex-1 space-y-4">
          {transactions.slice(0, limit).map((transaction) => (
            <li key={transaction.id}>
              <TransactionRow transaction={transaction} onClick={onItemClick} />
            </li>
          ))}
        </ul>
        <CardFooterLink href="/transactions" className="mt-4">View All</CardFooterLink>
      </div>
    </Card>
  );
}
