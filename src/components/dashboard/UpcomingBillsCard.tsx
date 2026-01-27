'use client';

import Card from '@/components/ui/Card';
import { Bill } from '@/types/dashboard';
import { getIcon } from '@/lib/iconMapping';
import { NavArrowRight } from 'iconoir-react';
import { formatNumber } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import Link from 'next/link';

interface UpcomingBillsCardProps {
  bills: Bill[];
}

export default function UpcomingBillsCard({ bills }: UpcomingBillsCardProps) {
  const { currency } = useCurrency();
  if (bills.length === 0) {
    return (
      <Card 
        title="Upcoming Bills"
        showActions={false}
      >
        <div className="flex flex-col flex-1 mt-2 justify-center items-center py-8 gap-1.5">
          <div className="text-body text-center opacity-80">No upcoming bills yet</div>
          <div className="text-helper text-center">Create a recurring bill to see it here</div>
        </div>
      </Card>
    );
  }

  return (
    <Card 
      title="Upcoming Bills"
      showActions={false}
    >
      <div className="flex flex-col flex-1 mt-2">
        <div className="space-y-4 flex-1">
          {bills.map((bill) => {
            const Icon = getIcon(bill.icon);
            return (
              <div key={bill.id} className="flex items-center gap-3 min-w-0">
                <div className="flex-shrink-0">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(163, 102, 203, 0.1)' }}
                  >
                    <Icon width={24} height={24} strokeWidth={1.5} style={{ color: '#E7E4E4' }} />
                  </div>
                </div>
                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="text-body font-medium text-wrap-safe">{bill.name}</div>
                  <div className="text-helper">{bill.date}</div>
                </div>
                <div className="text-body font-semibold flex-shrink-0 whitespace-nowrap">
                  {currency.symbol}{formatNumber(bill.amount)}
                </div>
              </div>
            );
          })}
        </div>
        <Link href="/expenses" className="text-helper flex items-center gap-1 mt-4 cursor-pointer group hover-text-purple transition-colors">
          View All <NavArrowRight width={14} height={14} className="stroke-current transition-colors" />
        </Link>
      </div>
    </Card>
  );
}

