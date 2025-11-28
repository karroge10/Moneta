'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';
import { LatestExpense } from '@/types/dashboard';
import { getIcon } from '@/lib/iconMapping';
import { NavArrowRight } from 'iconoir-react';
import { formatNumber } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import Link from 'next/link';

interface LatestExpensesCardProps {
  expenses: LatestExpense[];
}

export default function LatestExpensesCard({ expenses }: LatestExpensesCardProps) {
  const { currency } = useCurrency();
  // Group expenses by month
  const groupedByMonth: Record<string, LatestExpense[]> = {};
  expenses.forEach(exp => {
    const month = exp.month || 'Unknown';
    if (!groupedByMonth[month]) {
      groupedByMonth[month] = [];
    }
    groupedByMonth[month].push(exp);
  });

  // Get months sorted (most recent first)
  const months = Object.keys(groupedByMonth).sort((a, b) => {
    // Simple date comparison - assuming format like "January 2024"
    return new Date(b).getTime() - new Date(a).getTime();
  });

  // Only one month can be expanded at a time (accordion behavior)
  const [expandedMonth, setExpandedMonth] = useState<string | null>(months[0] || null);

  const toggleMonth = (month: string) => {
    // If clicking the same month, collapse it. Otherwise, expand the clicked month (closes others)
    setExpandedMonth(expandedMonth === month ? null : month);
  };

  if (expenses.length === 0) {
    return (
      <Card title="Latest Expenses">
        <div className="flex flex-col flex-1 mt-2 justify-center items-center py-8">
          <div className="text-body text-center mb-2 opacity-70">Add your first expense</div>
          <div className="text-helper text-center">Your recent expenses will appear here</div>
        </div>
      </Card>
    );
  }

  return (
    <Card title="Latest Expenses">
      <div className="flex flex-col flex-1 mt-2 min-h-0 overflow-hidden">
        <div className="h-[400px] overflow-y-auto overflow-x-hidden space-y-4 pr-2 custom-scrollbar">
          {months.map((month) => {
            const monthExpenses = groupedByMonth[month];
            const monthTotal = monthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
            const isExpanded = expandedMonth === month;

            return (
              <div key={month} className="overflow-hidden">
                <button
                  onClick={() => toggleMonth(month)}
                  className="w-full flex items-center justify-between py-2 text-body hover-text-purple transition-colors cursor-pointer"
                >
                  <span>{month}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-helper">{currency.symbol}{formatNumber(monthTotal)}</span>
                    <NavArrowRight 
                      width={14} 
                      height={14} 
                      className={`stroke-current transition-transform duration-300 ease-in-out ${isExpanded ? 'rotate-90' : ''}`} 
                    />
                  </div>
                </button>
                <div 
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isExpanded ? 'max-h-[200px] opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="ml-4 space-y-3 mt-2 pb-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-4">
                    {monthExpenses.map((expense) => {
                      const Icon = getIcon(expense.icon);
                      const originalAmount = expense.originalAmount ?? expense.amount;
                      const absoluteOriginalAmount = Math.abs(originalAmount);
                      const convertedAbsoluteAmount = Math.abs(expense.amount);
                      const displaySymbol = expense.originalCurrencySymbol ?? currency.symbol;
                      const shouldShowConvertedHelper =
                        !!expense.originalCurrencySymbol &&
                        (expense.originalCurrencySymbol !== currency.symbol ||
                          convertedAbsoluteAmount !== absoluteOriginalAmount);
                      return (
                        <div key={expense.id} className="flex items-center gap-3 min-w-0">
                          <div className="flex-shrink-0">
                            <div
                              className="w-12 h-12 rounded-full flex items-center justify-center"
                              style={{ backgroundColor: 'rgba(163, 102, 203, 0.1)' }}
                            >
                              <Icon width={24} height={24} strokeWidth={1.5} style={{ color: '#E7E4E4' }} />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <div className="text-body font-medium text-wrap-safe">{expense.name}</div>
                          </div>
                          <div className="flex flex-col items-end flex-shrink-0 text-right">
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
                </div>
              </div>
            );
          })}
        </div>

        <Link href="/expenses" className="text-helper flex items-center gap-1 mt-4 cursor-pointer group hover-text-purple transition-colors flex-wrap">
          <span className="text-wrap-safe break-words">View All</span> <NavArrowRight width={14} height={14} className="stroke-current transition-colors flex-shrink-0" />
        </Link>
      </div>
    </Card>
  );
}

