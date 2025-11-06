import Card from '@/components/ui/Card';
import { Transaction } from '@/types/dashboard';
import { getIcon } from '@/lib/iconMapping';
import { NavArrowRight } from 'iconoir-react';
import { formatNumber } from '@/lib/utils';
import Link from 'next/link';

interface TransactionsCardProps {
  transactions: Transaction[];
}

export default function TransactionsCard({ transactions }: TransactionsCardProps) {
  if (transactions.length === 0) {
    return (
      <Card title="Transactions" href="/transactions">
        <div className="flex flex-col flex-1 mt-2 justify-center items-center py-8">
          <div className="text-body text-center mb-2 opacity-70">Add your first transaction</div>
          <div className="text-helper text-center">Start tracking your spending and income</div>
        </div>
      </Card>
    );
  }

  return (
    <Card title="Transactions" href="/transactions">
      <div className="flex flex-col flex-1 mt-2">
        <div className="space-y-4 flex-1">
          {transactions.slice(0, 6).map((transaction) => {
            const Icon = getIcon(transaction.icon);
            return (
              <div key={transaction.id} className="flex items-center gap-3 min-w-0">
                <div className="flex-shrink-0">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(163, 102, 203, 0.1)' }}
                  >
                    <Icon width={24} height={24} strokeWidth={1.5} style={{ color: '#E7E4E4' }} />
                  </div>
                </div>
                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="text-body font-medium text-wrap-safe">{transaction.name}</div>
                  <div className="text-helper">{transaction.date}</div>
                </div>
                <div className="text-body font-semibold flex-shrink-0 whitespace-nowrap">
                  ${formatNumber(transaction.amount)}
                </div>
              </div>
            );
          })}
        </div>
        <Link href="/transactions" className="text-helper flex items-center gap-1 mt-4 cursor-pointer group hover-text-purple transition-colors">
          View All <NavArrowRight width={14} height={14} className="stroke-current transition-colors" />
        </Link>
      </div>
    </Card>
  );
}

