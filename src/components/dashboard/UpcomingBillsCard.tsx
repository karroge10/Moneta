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
  onItemClick?: (bill: Bill) => void;
}

export default function UpcomingBillsCard({ bills, onItemClick }: UpcomingBillsCardProps) {
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
              <div
                key={bill.id}
                className={`flex items-center gap-3 min-w-0 ${bill.isActive === false ? 'opacity-70' : ''} ${onItemClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                onClick={onItemClick ? () => onItemClick(bill) : undefined}
                role={onItemClick ? 'button' : undefined}
              >
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
                <div className="flex items-center gap-2 flex-shrink-0">
                  {bill.isActive === false && (
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded-full shrink-0"
                      style={{
                        backgroundColor: 'rgba(60, 60, 60, 0.6)',
                        color: 'rgba(231, 228, 228, 0.7)',
                      }}
                    >
                      Paused
                    </span>
                  )}
                  <span className="text-body font-semibold whitespace-nowrap">
                    {currency.symbol}{formatNumber(bill.amount)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        <Link href="/transactions?view=future" className="text-helper flex items-center gap-1 mt-4 cursor-pointer group hover-text-purple transition-colors" onClick={(e) => e.stopPropagation()}>
          View All <NavArrowRight width={14} height={14} className="stroke-current transition-colors" />
        </Link>
      </div>
    </Card>
  );
}

