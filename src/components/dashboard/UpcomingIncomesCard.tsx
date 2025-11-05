import Card from '@/components/ui/Card';
import { Transaction } from '@/types/dashboard';
import { getIcon } from '@/lib/iconMapping';
import { NavArrowRight } from 'iconoir-react';
import { formatNumber } from '@/lib/utils';
import Link from 'next/link';

interface UpcomingIncomesCardProps {
  incomes: Transaction[];
}

export default function UpcomingIncomesCard({ incomes }: UpcomingIncomesCardProps) {
  if (incomes.length === 0) {
    return (
      <Card title="Upcoming Incomes">
        <div className="flex flex-col flex-1 mt-2 justify-center items-center py-8">
          <div className="text-body text-center mb-2 opacity-70">Add your first income</div>
          <div className="text-helper text-center">Track recurring income and expected payments</div>
        </div>
      </Card>
    );
  }

  return (
    <Card title="Upcoming Incomes">
      <div className="flex flex-col flex-1 mt-2">
        <div className="space-y-4 flex-1">
          {incomes.map((income) => {
            const Icon = getIcon(income.icon);
            return (
              <div key={income.id} className="flex items-center gap-3 min-w-0">
                <div className="flex-shrink-0">
                  <Icon width={24} height={24} strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="text-body font-medium text-wrap-safe">{income.name}</div>
                  <div className="text-helper">{income.date}</div>
                </div>
                <div className="text-body font-semibold flex-shrink-0 whitespace-nowrap">
                  ${formatNumber(income.amount)}
                </div>
              </div>
            );
          })}
        </div>
        <Link href="/income" className="text-helper flex items-center gap-1 mt-4 cursor-pointer group hover-text-purple transition-colors">
          View All <NavArrowRight width={14} height={14} className="stroke-current transition-colors" />
        </Link>
      </div>
    </Card>
  );
}

