'use client';

import Card from '@/components/ui/Card';
import { Transaction } from '@/types/dashboard';
import { getIcon } from '@/lib/iconMapping';
import { NavArrowRight } from 'iconoir-react';
import { formatNumber } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import Link from 'next/link';

interface UpcomingIncomesCardProps {
  incomes: Transaction[];
  onItemClick?: (income: Transaction) => void;
}

export default function UpcomingIncomesCard({ incomes, onItemClick }: UpcomingIncomesCardProps) {
  const { currency } = useCurrency();
  if (incomes.length === 0) {
    return (
      <Card 
        title="Upcoming Incomes"
      >
        <div className="flex flex-col flex-1 mt-2 justify-center items-center py-8 gap-1.5">
          <div className="text-body text-center opacity-80">No upcoming incomes yet</div>
          <div className="text-helper text-center">Create a recurring income to see it here</div>
        </div>
      </Card>
    );
  }

  return (
    <Card 
      title="Upcoming Incomes"
    >
      <div className="flex flex-col flex-1 mt-2">
        <div className="space-y-4 flex-1">
          {incomes.map((income) => {
            const Icon = getIcon(income.icon);
            return (
              <div
                key={income.id}
                className={`flex items-center gap-3 min-w-0 ${income.isActive === false ? 'opacity-70' : ''} ${onItemClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                onClick={onItemClick ? () => onItemClick(income) : undefined}
                role={onItemClick ? 'button' : undefined}
              >
                <div className="flex-shrink-0">
                  <div
                    className="w-12 h-12 icon-circle"
                    style={{ backgroundColor: 'rgba(163, 102, 203, 0.1)' }}
                  >
                    <Icon width={24} height={24} strokeWidth={1.5} style={{ color: '#AC66DA' }} />
                  </div>
                </div>
                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="text-body font-medium text-wrap-safe">{income.name}</div>
                  <div className="text-helper">{income.date}</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {income.isActive === false && (
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
                    {currency.symbol}{formatNumber(income.amount)}
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

