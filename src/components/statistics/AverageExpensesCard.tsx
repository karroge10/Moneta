'use client';

import Card from '@/components/ui/Card';
import { formatNumber } from '@/lib/utils';
import { getIcon } from '@/lib/iconMapping';
import ComingSoonBadge from '@/components/ui/ComingSoonBadge';
import { useCurrency } from '@/hooks/useCurrency';

interface AverageExpense {
  id: string;
  name: string;
  amount: number;
  icon: string;
  color: string;
  percentage?: number;
}

const SKELETON_STYLE = { backgroundColor: '#3a3a3a' };
const SKELETON_ROWS = 4;

interface AverageExpensesCardProps {
  expenses: AverageExpense[];
  loading?: boolean;
}

export default function AverageExpensesCard({ expenses, loading = false }: AverageExpensesCardProps) {
  const { currency } = useCurrency();
  const isEmpty = expenses.length === 0;

  if (loading) {
    return (
      <Card title="Average Expenses">
        <div className="overflow-y-auto custom-scrollbar mt-2 pr-2" style={{ maxHeight: '300px' }}>
          <div className="flex flex-col gap-3">
            {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full shrink-0 animate-pulse" style={SKELETON_STYLE} />
                <div className="h-4 flex-1 max-w-[120px] rounded animate-pulse" style={SKELETON_STYLE} />
                <div className="h-4 w-16 rounded animate-pulse shrink-0" style={SKELETON_STYLE} />
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card 
      title="Average Expenses"
      customHeader={
        isEmpty ? (
          <div className="mb-4 flex items-center gap-3">
            <h2 className="text-card-header">Average Expenses</h2>
            <ComingSoonBadge />
          </div>
        ) : undefined
      }
    >
      {isEmpty ? (
        <div className="flex flex-col flex-1 mt-2 justify-center items-center py-8" style={{ filter: 'blur(2px)' }}>
          <div className="text-body text-center mb-2 opacity-70">Add transactions to see average expenses</div>
          <div className="text-helper text-center">Category averages will appear here</div>
        </div>
      ) : (
        <div className="overflow-y-auto custom-scrollbar mt-2 pr-2" style={{ maxHeight: '300px' }}>
          <div className="flex flex-col gap-3">
            {expenses.map((expense) => {
              const Icon = getIcon(expense.icon);
              return (
                <div
                  key={expense.id}
                  className="flex items-center gap-3 min-w-0"
                >
                  <div className="flex-shrink-0">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: 'rgba(163, 102, 203, 0.1)' }}
                    >
                      <Icon
                        width={20}
                        height={20}
                        strokeWidth={1.5}
                        style={{ color: '#E7E4E4' }}
                      />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 text-body font-medium text-wrap-safe break-words">
                    {expense.name}
                    {expense.percentage !== undefined && (
                      <span className="text-helper ml-2">({expense.percentage}%)</span>
                    )}
                  </div>
                  <div className="text-body font-semibold flex-shrink-0 whitespace-nowrap">
                    {currency.symbol} {formatNumber(expense.amount)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}

