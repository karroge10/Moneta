'use client';

import Card from '@/components/ui/Card';
import { LatestIncome } from '@/types/dashboard';
import { getIcon } from '@/lib/iconMapping';
import { NavArrowRight } from 'iconoir-react';
import { formatNumber } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import Link from 'next/link';

interface LatestIncomesCardProps {
  incomes: LatestIncome[];
  onItemClick?: (income: LatestIncome) => void;
}

const MAX_NAME_LENGTH = 25;

function truncateName(name: string, maxLength: number): string {
  if (name.length <= maxLength) return name;
  return name.substring(0, maxLength) + '...';
}

export default function LatestIncomesCard({ incomes, onItemClick }: LatestIncomesCardProps) {
  const { currency } = useCurrency();

  if (incomes.length === 0) {
    return (
      <Card title="Latest Incomes" href="/transactions">
        <div className="flex flex-col flex-1 mt-2 justify-center items-center py-8">
          <div className="text-body text-center mb-2 opacity-70">Add transactions to see your income</div>
          <div className="text-helper text-center">Your latest income will appear here</div>
        </div>
      </Card>
    );
  }

  return (
    <Card title="Latest Incomes" href="/transactions">
      <div className="flex flex-col flex-1 mt-2">
        <div className="space-y-4 flex-1">
          {incomes.slice(0, 6).map((income) => {
            const Icon = getIcon(income.icon);
            const originalAmount = income.originalAmount ?? income.amount;
            const absoluteOriginalAmount = Math.abs(originalAmount);
            const convertedAbsoluteAmount = Math.abs(income.amount);
            const displaySymbol = income.originalCurrencySymbol ?? currency.symbol;
            const shouldShowConvertedHelper =
              !!income.originalCurrencySymbol &&
              (income.originalCurrencySymbol !== currency.symbol ||
                convertedAbsoluteAmount !== absoluteOriginalAmount);
            const truncatedName = truncateName(income.name, MAX_NAME_LENGTH);
            
            return (
              <div 
                key={income.id} 
                className={`flex items-center gap-3 min-w-0 ${onItemClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                onClick={onItemClick ? () => onItemClick(income) : undefined}
                role={onItemClick ? 'button' : undefined}
              >
                <div className="shrink-0">
                  <div
                    className="w-12 h-12 icon-circle"
                    style={{ backgroundColor: `${income.color || '#AC66DA'}1a` }}
                  >
                    <Icon width={24} height={24} strokeWidth={1.5} style={{ color: income.color || '#AC66DA' }} />
                  </div>
                </div>
                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="text-body font-medium truncate" title={income.name.length > MAX_NAME_LENGTH ? income.name : undefined}>
                    {truncatedName}
                  </div>
                  <div className="text-helper">{income.date}</div>
                </div>
                <div className="flex flex-col items-end shrink-0 text-right">
                  <div className="text-body font-semibold whitespace-nowrap">
                    {displaySymbol}{formatNumber(absoluteOriginalAmount)}
                  </div>
                  {shouldShowConvertedHelper && (
                    <div className="text-helper text-xs whitespace-nowrap">
                      ≈ {currency.symbol}{formatNumber(convertedAbsoluteAmount)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <Link 
          href="/transactions" 
          className="text-helper flex items-center gap-1 mt-4 cursor-pointer group hover-text-purple transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          View All <NavArrowRight width={14} height={14} className="stroke-current transition-colors" />
        </Link>
      </div>
    </Card>
  );
}
