'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';
import { LatestIncome } from '@/types/dashboard';
import { getIcon } from '@/lib/iconMapping';
import { NavArrowRight } from 'iconoir-react';
import { formatNumber } from '@/lib/utils';
import Link from 'next/link';

interface LatestIncomesCardProps {
  incomes: LatestIncome[];
}

export default function LatestIncomesCard({ incomes }: LatestIncomesCardProps) {
  // Group incomes by month
  const groupedByMonth: Record<string, LatestIncome[]> = {};
  incomes.forEach(inc => {
    const month = inc.month || 'Unknown';
    if (!groupedByMonth[month]) {
      groupedByMonth[month] = [];
    }
    groupedByMonth[month].push(inc);
  });

  // Get months sorted (most recent first)
  const months = Object.keys(groupedByMonth).sort((a, b) => {
    return new Date(b).getTime() - new Date(a).getTime();
  });

  // Only one month can be expanded at a time (accordion behavior)
  const [expandedMonth, setExpandedMonth] = useState<string | null>(months[0] || null);

  const toggleMonth = (month: string) => {
    // If clicking the same month, collapse it. Otherwise, expand the clicked month (closes others)
    setExpandedMonth(expandedMonth === month ? null : month);
  };

  if (incomes.length === 0) {
    return (
      <Card title="Latest Incomes">
        <div className="flex flex-col flex-1 mt-2 justify-center items-center py-8">
          <div className="text-body text-center mb-2 opacity-70">Add your first income</div>
          <div className="text-helper text-center">Your recent income will appear here</div>
        </div>
      </Card>
    );
  }

  return (
    <Card title="Latest Incomes">
      <div className="flex flex-col flex-1 mt-2 min-h-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 space-y-4">
          {months.map((month) => {
            const monthIncomes = groupedByMonth[month];
            const monthTotal = monthIncomes.reduce((sum, inc) => sum + inc.amount, 0);
            const isExpanded = expandedMonth === month;

            return (
              <div key={month} className="overflow-hidden">
                <button
                  onClick={() => toggleMonth(month)}
                  className="w-full flex items-center justify-between py-2 text-body hover-text-purple transition-colors cursor-pointer"
                >
                  <span>{month}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-helper">${formatNumber(monthTotal)}</span>
                    <NavArrowRight 
                      width={14} 
                      height={14} 
                      className={`stroke-current transition-transform duration-300 ease-in-out ${isExpanded ? 'rotate-90' : ''}`} 
                    />
                  </div>
                </button>
                <div 
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="ml-4 space-y-3 mt-2 pb-2">
                    {monthIncomes.map((income) => {
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
                </div>
              </div>
            );
          })}
        </div>

        <Link href="/income" className="text-helper flex items-center gap-1 mt-4 cursor-pointer group hover-text-purple transition-colors flex-wrap">
          <span className="text-wrap-safe break-words">View All</span> <NavArrowRight width={14} height={14} className="stroke-current transition-colors flex-shrink-0" />
        </Link>
      </div>
    </Card>
  );
}

