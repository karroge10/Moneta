import Card from '@/components/ui/Card';
import { Bill } from '@/types/dashboard';
import { getIcon } from '@/lib/iconMapping';
import { NavArrowRight } from 'iconoir-react';
import { formatNumber } from '@/lib/utils';

interface UpcomingBillsCardProps {
  bills: Bill[];
}

export default function UpcomingBillsCard({ bills }: UpcomingBillsCardProps) {
  return (
    <Card title="Upcoming Bills">
      <div className="space-y-4 mt-2">
        {bills.map((bill) => {
          const Icon = getIcon(bill.icon);
          return (
            <div key={bill.id} className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <Icon width={24} height={24} strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-body font-medium">{bill.name}</div>
                <div className="text-helper">{bill.date}</div>
              </div>
              <div className="text-body font-semibold">
                ${formatNumber(bill.amount)}
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

