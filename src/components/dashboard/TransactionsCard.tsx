import Card from '@/components/ui/Card';
import { Transaction } from '@/types/dashboard';
import { getIcon } from '@/lib/iconMapping';
import { NavArrowRight } from 'iconoir-react';
import { formatNumber } from '@/lib/utils';

interface TransactionsCardProps {
  transactions: Transaction[];
}

export default function TransactionsCard({ transactions }: TransactionsCardProps) {
  return (
    <Card title="Transactions" href="/transactions">
      <div className="space-y-4 mt-2">
        {transactions.map((transaction) => {
          const Icon = getIcon(transaction.icon);
          return (
            <div key={transaction.id} className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <Icon width={24} height={24} strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-body font-medium">{transaction.name}</div>
                <div className="text-helper">{transaction.date}</div>
              </div>
              <div className="text-body font-semibold">
                ${formatNumber(transaction.amount)}
              </div>
            </div>
          );
        })}
      </div>
      <div className="text-helper flex items-center gap-1 mt-4 cursor-pointer group hover-text-purple transition-colors">
        View All <NavArrowRight width={14} height={14} className="stroke-current transition-colors" />
      </div>
    </Card>
  );
}

